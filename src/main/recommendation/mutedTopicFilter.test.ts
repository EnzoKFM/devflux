import { describe, expect, it } from 'vitest'
import type { StoredTopicPreference } from '../repositories/topicPreferenceRepository'
import { TOPIC_MATCH_MIN_SIMILARITY } from './closestTopic'
import { isArticleOfMutedTopic } from './mutedTopicFilter'

const topicVectors = new Map<string, Float32Array>([
  ['php', new Float32Array([1, 0, 0])],
  ['python', new Float32Array([0, 1, 0])]
])
const topicPreferences = new Map<string, StoredTopicPreference>([['php', 'muted']])

describe('isArticleOfMutedTopic', () => {
  it('exclut un article dont le sujet le plus proche est masqué', () => {
    expect(isArticleOfMutedTopic(new Float32Array([0.9, 0.2, 0.1]), topicVectors, topicPreferences)).toBe(true)
  })

  it('garde un article dont le sujet le plus proche n est pas masqué', () => {
    expect(isArticleOfMutedTopic(new Float32Array([0.5, 0.8, 0]), topicVectors, topicPreferences)).toBe(false)
  })

  it(`garde un article trop éloigné du sujet masqué (similarité < ${TOPIC_MATCH_MIN_SIMILARITY})`, () => {
    expect(isArticleOfMutedTopic(new Float32Array([0.3, 0.1, 1]), topicVectors, topicPreferences)).toBe(false)
  })

  it('garde un article sans embedding', () => {
    expect(isArticleOfMutedTopic(null, topicVectors, topicPreferences)).toBe(false)
  })
})
