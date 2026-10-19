import type { StoredTopicPreference } from '../repositories/topicPreferenceRepository'
import { cosineSimilarity } from './vectorMath'

export const MUTED_TOPIC_MIN_SIMILARITY = 0.35

export function isArticleOfMutedTopic(
  articleVector: Float32Array | null,
  topicVectors: Map<string, Float32Array>,
  topicPreferences: Map<string, StoredTopicPreference>
): boolean {
  if (!articleVector) {
    return false
  }
  let closestTopicId: string | null = null
  let closestTopicSimilarity = Number.NEGATIVE_INFINITY
  for (const [topicId, topicVector] of topicVectors) {
    const topicSimilarity = cosineSimilarity(articleVector, topicVector)
    if (topicSimilarity > closestTopicSimilarity) {
      closestTopicId = topicId
      closestTopicSimilarity = topicSimilarity
    }
  }
  return (
    closestTopicId !== null &&
    topicPreferences.get(closestTopicId) === 'muted' &&
    closestTopicSimilarity >= MUTED_TOPIC_MIN_SIMILARITY
  )
}
