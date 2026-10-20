import type { StoredTopicPreference } from '../repositories/topicPreferenceRepository'
import { findClosestTopicId } from './closestTopic'

export function isArticleOfMutedTopic(
  articleVector: Float32Array | null,
  topicVectors: Map<string, Float32Array>,
  topicPreferences: Map<string, StoredTopicPreference>
): boolean {
  const closestTopicId = findClosestTopicId(articleVector, topicVectors)
  return closestTopicId !== null && topicPreferences.get(closestTopicId) === 'muted'
}
