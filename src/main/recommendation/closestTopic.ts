import { cosineSimilarity } from './vectorMath'

export const TOPIC_MATCH_MIN_SIMILARITY = 0.35

export function findClosestTopicId(
  articleVector: Float32Array | null,
  topicVectors: Map<string, Float32Array>
): string | null {
  if (!articleVector) {
    return null
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
  return closestTopicSimilarity >= TOPIC_MATCH_MIN_SIMILARITY ? closestTopicId : null
}
