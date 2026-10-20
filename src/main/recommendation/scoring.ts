import { ARTICLE_MAX_AGE_IN_DAYS } from '@shared/contract'
import { MILLISECONDS_PER_DAY } from '@shared/time'
import type { RatedArticle } from '../repositories/feedbackRepository'
import type { StoredTopicPreference } from '../repositories/topicPreferenceRepository'
import type { TrainingSample } from './logisticRegression'
import { classifyContentSignal, resolveSourceVote, type ContentSignal, type SourceVote } from './signals'
import { cosineSimilarity, subtractVector, sumVectors } from './vectorMath'

export const SOURCE_AFFINITY_PRIOR_STRENGTH = 2
export const NEGATIVE_SIMILARITY_WEIGHT = 0.5
export const SOURCE_AFFINITY_WEIGHT = 0.15
export const FRESHNESS_WEIGHT = 0.05

export interface SourceVoteCounts {
  likeCount: number
  dislikeCount: number
}

export interface RelevanceFeatures {
  positiveSimilarity: number
  negativeSimilarity: number
  sourceAffinity: number
  freshness: number
}

export interface RelevanceProfile {
  positiveSum: Float32Array | null
  positiveCount: number
  negativeSum: Float32Array | null
  negativeCount: number
  sourceVoteCounts: Map<string, SourceVoteCounts>
}

export interface ScoredArticle {
  vector: Float32Array | null
  sourceKey: string
  publishedAt: string
}

interface LeaveOutExample {
  vector: Float32Array
  contentSignal: ContentSignal
  sourceVote: SourceVote
}

export function collectSourceVoteCounts(ratedArticles: RatedArticle[]): Map<string, SourceVoteCounts> {
  const sourceVoteCounts = new Map<string, SourceVoteCounts>()
  for (const ratedArticle of ratedArticles) {
    const sourceVote = resolveSourceVote(ratedArticle)
    if (sourceVote === 0) {
      continue
    }
    const voteCounts = sourceVoteCounts.get(ratedArticle.sourceKey) ?? { likeCount: 0, dislikeCount: 0 }
    if (sourceVote === 1) {
      voteCounts.likeCount += 1
    } else {
      voteCounts.dislikeCount += 1
    }
    sourceVoteCounts.set(ratedArticle.sourceKey, voteCounts)
  }
  return sourceVoteCounts
}

export function smoothSourceAffinity(likeCount: number, dislikeCount: number): number {
  return (likeCount - dislikeCount) / (likeCount + dislikeCount + SOURCE_AFFINITY_PRIOR_STRENGTH)
}

function computeSourceAffinity(
  sourceVoteCounts: Map<string, SourceVoteCounts>,
  sourceKey: string,
  leftOutVote: SourceVote
): number {
  const voteCounts = sourceVoteCounts.get(sourceKey)
  if (!voteCounts) {
    return 0
  }
  return smoothSourceAffinity(
    voteCounts.likeCount - (leftOutVote === 1 ? 1 : 0),
    voteCounts.dislikeCount - (leftOutVote === -1 ? 1 : 0)
  )
}

export function computeFreshness(publishedAt: string, referenceTime: number): number {
  const ageInDays = Math.max(0, referenceTime - Date.parse(publishedAt)) / MILLISECONDS_PER_DAY
  return Math.max(0, 1 - ageInDays / ARTICLE_MAX_AGE_IN_DAYS)
}

export function buildRelevanceProfile(inputs: {
  ratedArticles: RatedArticle[]
  articleVectors: Map<number, Float32Array>
  topicPreferences: Map<string, StoredTopicPreference>
  topicVectors: Map<string, Float32Array>
}): RelevanceProfile {
  const positiveVectors: Float32Array[] = []
  const negativeVectors: Float32Array[] = []

  for (const ratedArticle of inputs.ratedArticles) {
    const articleVector = inputs.articleVectors.get(ratedArticle.articleId)
    const contentSignal = classifyContentSignal(ratedArticle)
    if (!articleVector || contentSignal === 'none') {
      continue
    }
    if (contentSignal === 'positive') {
      positiveVectors.push(articleVector)
    } else {
      negativeVectors.push(articleVector)
    }
  }
  for (const [topicId, topicPreference] of inputs.topicPreferences) {
    const topicVector = inputs.topicVectors.get(topicId)
    if (topicVector) {
      if (topicPreference === 'followed') {
        positiveVectors.push(topicVector)
      } else {
        negativeVectors.push(topicVector)
      }
    }
  }

  return {
    positiveSum: sumVectors(positiveVectors),
    positiveCount: positiveVectors.length,
    negativeSum: sumVectors(negativeVectors),
    negativeCount: negativeVectors.length,
    sourceVoteCounts: collectSourceVoteCounts(inputs.ratedArticles)
  }
}

function similarityToProfileSide(
  vector: Float32Array | null,
  sideSum: Float32Array | null,
  sideCount: number,
  leftOutVector: Float32Array | null
): number {
  if (!vector || !sideSum) {
    return 0
  }
  if (!leftOutVector) {
    return cosineSimilarity(vector, sideSum)
  }
  return sideCount <= 1 ? 0 : cosineSimilarity(vector, subtractVector(sideSum, leftOutVector))
}

function computeFeatures(
  relevanceProfile: RelevanceProfile,
  scoredArticle: ScoredArticle,
  referenceTime: number,
  leftOutExample: LeaveOutExample | null
): RelevanceFeatures {
  return {
    positiveSimilarity: similarityToProfileSide(
      scoredArticle.vector,
      relevanceProfile.positiveSum,
      relevanceProfile.positiveCount,
      leftOutExample?.contentSignal === 'positive' ? leftOutExample.vector : null
    ),
    negativeSimilarity: similarityToProfileSide(
      scoredArticle.vector,
      relevanceProfile.negativeSum,
      relevanceProfile.negativeCount,
      leftOutExample?.contentSignal === 'negative' ? leftOutExample.vector : null
    ),
    sourceAffinity: computeSourceAffinity(
      relevanceProfile.sourceVoteCounts,
      scoredArticle.sourceKey,
      leftOutExample?.sourceVote ?? 0
    ),
    freshness: computeFreshness(scoredArticle.publishedAt, referenceTime)
  }
}

export function computeCandidateFeatures(
  relevanceProfile: RelevanceProfile,
  scoredArticle: ScoredArticle,
  referenceTime: number
): RelevanceFeatures {
  return computeFeatures(relevanceProfile, scoredArticle, referenceTime, null)
}

export function computeSimilarityContributions(relevanceFeatures: RelevanceFeatures): number[] {
  return [
    relevanceFeatures.positiveSimilarity,
    -NEGATIVE_SIMILARITY_WEIGHT * relevanceFeatures.negativeSimilarity,
    SOURCE_AFFINITY_WEIGHT * relevanceFeatures.sourceAffinity,
    FRESHNESS_WEIGHT * relevanceFeatures.freshness
  ]
}

export function computeSimilarityScore(relevanceFeatures: RelevanceFeatures): number {
  return computeSimilarityContributions(relevanceFeatures).reduce(
    (similarityScore, featureContribution) => similarityScore + featureContribution,
    0
  )
}

export function toFeatureVector(relevanceFeatures: RelevanceFeatures): number[] {
  return [
    relevanceFeatures.positiveSimilarity,
    relevanceFeatures.negativeSimilarity,
    relevanceFeatures.sourceAffinity,
    relevanceFeatures.freshness
  ]
}

export function buildTrainingSamples(
  relevanceProfile: RelevanceProfile,
  ratedArticles: RatedArticle[],
  articleVectors: Map<number, Float32Array>,
  fallbackReferenceTime: number
): TrainingSample[] {
  const trainingSamples: TrainingSample[] = []
  for (const ratedArticle of ratedArticles) {
    const articleVector = articleVectors.get(ratedArticle.articleId)
    const contentSignal = classifyContentSignal(ratedArticle)
    if (!articleVector || contentSignal === 'none') {
      continue
    }
    const referenceTime = ratedArticle.digestDate
      ? new Date(`${ratedArticle.digestDate}T12:00:00`).getTime()
      : fallbackReferenceTime
    const relevanceFeatures = computeFeatures(
      relevanceProfile,
      { vector: articleVector, sourceKey: ratedArticle.sourceKey, publishedAt: ratedArticle.publishedAt },
      referenceTime,
      { vector: articleVector, contentSignal, sourceVote: resolveSourceVote(ratedArticle) }
    )
    trainingSamples.push({ features: toFeatureVector(relevanceFeatures), isPositive: contentSignal === 'positive' })
  }
  return trainingSamples
}
