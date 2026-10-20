import type Database from 'better-sqlite3'
import type {
  DigestCandidate,
  DigestSelection,
  StoredRecommendationReason
} from '../repositories/articleRepository'
import { loadArticleVectors, loadTopicVectors } from '../repositories/embeddingRepository'
import { findClosestTopicId } from './closestTopic'
import { isArticleOfMutedTopic } from './mutedTopicFilter'
import { predictProbability, trainLogisticRegression } from './logisticRegression'
import { resolveDominantSignal } from './recommendationReason'
import {
  buildRelevanceProfile,
  buildTrainingSamples,
  computeCandidateFeatures,
  computeSimilarityScore,
  toFeatureVector
} from './scoring'
import { selectRecommendedArticles, type RankedCandidate } from './selection'
import type { RecommendationSignals } from './signals'

export interface RecommendedSelectionOptions {
  database: Database.Database
  candidates: DigestCandidate[]
  recommendationSignals: RecommendationSignals
  isTrainedMode: boolean
  modelId: string
  now: Date
  random: () => number
}

export function selectByRecommendation(options: RecommendedSelectionOptions): DigestSelection[] {
  const articleVectors = loadArticleVectors(options.database, options.modelId)
  const topicVectors = loadTopicVectors(options.database, options.modelId)
  const referenceTime = options.now.getTime()
  const { ratedArticles, topicPreferences } = options.recommendationSignals

  const relevanceProfile = buildRelevanceProfile({ ratedArticles, articleVectors, topicPreferences, topicVectors })
  const trainedModel = options.isTrainedMode
    ? trainLogisticRegression(buildTrainingSamples(relevanceProfile, ratedArticles, articleVectors, referenceTime))
    : null

  const visibleCandidates = options.candidates.filter(
    (candidate) => !isArticleOfMutedTopic(articleVectors.get(candidate.id) ?? null, topicVectors, topicPreferences)
  )
  const recommendationMode = options.isTrainedMode ? 'trained' : 'similarity'
  const reasonByArticleId = new Map<number, StoredRecommendationReason>()
  const rankedCandidates: RankedCandidate[] = visibleCandidates.map((candidate) => {
    const relevanceFeatures = computeCandidateFeatures(
      relevanceProfile,
      {
        vector: articleVectors.get(candidate.id) ?? null,
        sourceKey: candidate.sourceKey,
        publishedAt: candidate.publishedAt
      },
      referenceTime
    )
    reasonByArticleId.set(candidate.id, {
      mode: recommendationMode,
      closestTopicId: findClosestTopicId(articleVectors.get(candidate.id) ?? null, topicVectors),
      dominantSignal: resolveDominantSignal(relevanceFeatures, trainedModel)
    })
    return {
      id: candidate.id,
      sourceKey: candidate.sourceKey,
      score: trainedModel
        ? predictProbability(trainedModel, toFeatureVector(relevanceFeatures))
        : computeSimilarityScore(relevanceFeatures),
      positiveSimilarity: relevanceFeatures.positiveSimilarity,
      negativeSimilarity: relevanceFeatures.negativeSimilarity,
      sourceAffinity: relevanceFeatures.sourceAffinity,
      vector: articleVectors.get(candidate.id) ?? null
    }
  })

  return selectRecommendedArticles({
    rankedCandidates,
    hasNegativeProfile: relevanceProfile.negativeSum !== null,
    random: options.random
  }).map((digestSelection) => {
    const recommendationReason = reasonByArticleId.get(digestSelection.articleId)
    return {
      ...digestSelection,
      recommendationReason:
        recommendationReason && digestSelection.isExploration
          ? { ...recommendationReason, dominantSignal: 'exploration' }
          : recommendationReason
    }
  })
}
