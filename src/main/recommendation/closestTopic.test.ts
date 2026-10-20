import { describe, expect, it } from 'vitest'
import { findClosestTopicId, TOPIC_MATCH_MIN_SIMILARITY } from './closestTopic'

const topicVectors = new Map<string, Float32Array>([
  ['php', new Float32Array([1, 0, 0])],
  ['python', new Float32Array([0, 1, 0])]
])

describe('findClosestTopicId', () => {
  it('renvoie le sujet le plus proche de l article', () => {
    expect(findClosestTopicId(new Float32Array([0.5, 0.8, 0]), topicVectors)).toBe('python')
  })

  it(`ignore un sujet trop éloigné (similarité < ${TOPIC_MATCH_MIN_SIMILARITY})`, () => {
    expect(findClosestTopicId(new Float32Array([0.3, 0.1, 1]), topicVectors)).toBeNull()
  })

  it('renvoie null pour un article sans embedding ou sans sujet vectorisé', () => {
    expect(findClosestTopicId(null, topicVectors)).toBeNull()
    expect(findClosestTopicId(new Float32Array([1, 0, 0]), new Map())).toBeNull()
  })
})
