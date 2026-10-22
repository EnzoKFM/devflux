import type { FeedbackReason, RecommendationMode } from '@shared/contract'
import type { RatedArticle } from '../repositories/feedbackRepository'
import type { StoredTopicPreference } from '../repositories/topicPreferenceRepository'

export const MIN_TRAINING_SAMPLE_COUNT = 20
export const MIN_TRAINING_SAMPLE_COUNT_PER_CLASS = 5

export type ContentSignal = 'positive' | 'negative' | 'none'
export type SourceVote = 1 | 0 | -1

const REASONS_WITHOUT_CONTENT_SIGNAL: ReadonlySet<FeedbackReason> = new Set(['already-seen', 'bad-source', 'not-french'])
const REASONS_WITHOUT_SOURCE_VOTE: ReadonlySet<FeedbackReason> = new Set(['already-seen', 'not-interesting', 'too-advanced'])

export interface RecommendationSignals {
  ratedArticles: RatedArticle[]
  topicPreferences: Map<string, StoredTopicPreference>
}

export function classifyContentSignal(ratedArticle: RatedArticle): ContentSignal {
  if (ratedArticle.rating === 'like') {
    return 'positive'
  }
  return ratedArticle.reason !== null && REASONS_WITHOUT_CONTENT_SIGNAL.has(ratedArticle.reason) ? 'none' : 'negative'
}

export function resolveSourceVote(ratedArticle: RatedArticle): SourceVote {
  if (ratedArticle.rating === 'like') {
    return 1
  }
  return ratedArticle.reason !== null && REASONS_WITHOUT_SOURCE_VOTE.has(ratedArticle.reason) ? 0 : -1
}

export function determineRecommendationMode(
  recommendationSignals: RecommendationSignals
): Exclude<RecommendationMode, 'unavailable'> {
  if (recommendationSignals.ratedArticles.length === 0 && recommendationSignals.topicPreferences.size === 0) {
    return 'cold-start'
  }
  const contentSignals = recommendationSignals.ratedArticles.map(classifyContentSignal)
  const positiveSampleCount = contentSignals.filter((contentSignal) => contentSignal === 'positive').length
  const negativeSampleCount = contentSignals.filter((contentSignal) => contentSignal === 'negative').length
  const hasEnoughSamples = positiveSampleCount + negativeSampleCount >= MIN_TRAINING_SAMPLE_COUNT
  const hasEnoughSamplesPerClass =
    positiveSampleCount >= MIN_TRAINING_SAMPLE_COUNT_PER_CLASS &&
    negativeSampleCount >= MIN_TRAINING_SAMPLE_COUNT_PER_CLASS
  return hasEnoughSamples && hasEnoughSamplesPerClass ? 'trained' : 'similarity'
}
