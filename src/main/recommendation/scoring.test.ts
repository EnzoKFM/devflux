import { describe, expect, it } from 'vitest'
import type { FeedbackReason } from '@shared/contract'
import type { RatedArticle } from '../repositories/feedbackRepository'
import {
  buildRelevanceProfile,
  buildTrainingSamples,
  collectSourceVoteCounts,
  computeCandidateFeatures,
  computeFreshness,
  computeSimilarityScore,
  smoothSourceAffinity
} from './scoring'

const REFERENCE_TIME = new Date('2026-10-19T12:00:00.000Z').getTime()

function buildRatedArticle(
  articleId: number,
  sourceKey: string,
  rating: 'like' | 'dislike',
  reason: FeedbackReason | null = null
): RatedArticle {
  return {
    articleId,
    sourceKey,
    sourceName: `Source ${sourceKey}`,
    rating,
    reason,
    title: `Article ${articleId}`,
    summary: null,
    publishedAt: '2026-10-18T12:00:00.000Z',
    digestDate: '2026-10-19'
  }
}

describe('affinité de source', () => {
  it('compte les likes et les 👎 de contenu ou de mauvaise source, jamais les « déjà vu »', () => {
    const sourceVoteCounts = collectSourceVoteCounts([
      buildRatedArticle(1, 'a', 'like'),
      buildRatedArticle(2, 'a', 'dislike', 'off-topic'),
      buildRatedArticle(3, 'a', 'dislike', 'bad-source'),
      buildRatedArticle(4, 'a', 'dislike', 'already-seen'),
      buildRatedArticle(5, 'b', 'dislike', 'already-seen')
    ])

    expect(sourceVoteCounts.get('a')).toEqual({ likeCount: 1, dislikeCount: 2 })
    expect(sourceVoteCounts.has('b')).toBe(false)
  })

  it('lisse l affinité par un prior bayésien', () => {
    expect(smoothSourceAffinity(0, 0)).toBe(0)
    expect(smoothSourceAffinity(1, 0)).toBeCloseTo(1 / 3)
    expect(smoothSourceAffinity(10, 0)).toBeGreaterThan(smoothSourceAffinity(1, 0))
    expect(smoothSourceAffinity(0, 3)).toBeCloseTo(-3 / 5)
    expect(smoothSourceAffinity(5, 5)).toBe(0)
  })
})

describe('fraîcheur', () => {
  it('décroît doucement de 1 à 0 sur 14 jours', () => {
    const publishedDaysAgo = (dayCount: number): string =>
      new Date(REFERENCE_TIME - dayCount * 24 * 60 * 60 * 1000).toISOString()

    expect(computeFreshness(publishedDaysAgo(0), REFERENCE_TIME)).toBe(1)
    expect(computeFreshness(publishedDaysAgo(7), REFERENCE_TIME)).toBeCloseTo(0.5)
    expect(computeFreshness(publishedDaysAgo(14), REFERENCE_TIME)).toBeCloseTo(0)
    expect(computeFreshness(publishedDaysAgo(30), REFERENCE_TIME)).toBe(0)
    expect(computeFreshness(publishedDaysAgo(-1), REFERENCE_TIME)).toBe(1)
  })

  it('pèse peu face à la pertinence', () => {
    const relevantButOld = computeSimilarityScore({
      positiveSimilarity: 0.4,
      negativeSimilarity: 0,
      sourceAffinity: 0,
      freshness: 0
    })
    const freshButIrrelevant = computeSimilarityScore({
      positiveSimilarity: 0.1,
      negativeSimilarity: 0,
      sourceAffinity: 0,
      freshness: 1
    })

    expect(relevantButOld).toBeGreaterThan(freshButIrrelevant)
  })
})

describe('profil de pertinence', () => {
  const reactVector = Float32Array.from([1, 0, 0])
  const cssVector = Float32Array.from([0, 1, 0])
  const articleVectors = new Map([
    [1, reactVector],
    [2, cssVector],
    [3, Float32Array.from([0, 0, 1])]
  ])

  it('construit les centroïdes à partir des 👍, des 👎 de contenu et des sujets', () => {
    const relevanceProfile = buildRelevanceProfile({
      ratedArticles: [
        buildRatedArticle(1, 'a', 'like'),
        buildRatedArticle(2, 'b', 'dislike', 'off-topic'),
        buildRatedArticle(3, 'c', 'dislike', 'already-seen')
      ],
      articleVectors,
      topicPreferences: new Map(),
      topicVectors: new Map()
    })

    expect(relevanceProfile.positiveCount).toBe(1)
    expect(relevanceProfile.negativeCount).toBe(1)
    expect(Array.from(relevanceProfile.positiveSum ?? [])).toEqual([1, 0, 0])
    expect(Array.from(relevanceProfile.negativeSum ?? [])).toEqual([0, 1, 0])
  })

  it('ajoute les sujets suivis au positif et les sujets masqués au négatif', () => {
    const relevanceProfile = buildRelevanceProfile({
      ratedArticles: [],
      articleVectors,
      topicPreferences: new Map([
        ['react', 'followed'],
        ['css', 'muted']
      ]),
      topicVectors: new Map([
        ['react', reactVector],
        ['css', cssVector]
      ])
    })

    expect(Array.from(relevanceProfile.positiveSum ?? [])).toEqual([1, 0, 0])
    expect(Array.from(relevanceProfile.negativeSum ?? [])).toEqual([0, 1, 0])
  })

  it('score un candidat proche des 👍 au-dessus d un candidat proche des 👎', () => {
    const relevanceProfile = buildRelevanceProfile({
      ratedArticles: [buildRatedArticle(1, 'a', 'like'), buildRatedArticle(2, 'b', 'dislike', 'off-topic')],
      articleVectors,
      topicPreferences: new Map(),
      topicVectors: new Map()
    })
    const publishedAt = '2026-10-18T12:00:00.000Z'

    const reactCandidate = computeCandidateFeatures(
      relevanceProfile,
      { vector: reactVector, sourceKey: 'z', publishedAt },
      REFERENCE_TIME
    )
    const cssCandidate = computeCandidateFeatures(
      relevanceProfile,
      { vector: cssVector, sourceKey: 'z', publishedAt },
      REFERENCE_TIME
    )

    expect(computeSimilarityScore(reactCandidate)).toBeGreaterThan(computeSimilarityScore(cssCandidate))
    expect(cssCandidate.negativeSimilarity).toBeCloseTo(1)
  })

  it('calcule les exemples d entraînement en leave-one-out, source comprise', () => {
    const ratedArticles = [
      buildRatedArticle(1, 'a', 'like'),
      buildRatedArticle(2, 'b', 'dislike', 'off-topic'),
      buildRatedArticle(3, 'a', 'like')
    ]
    const vectorsForTraining = new Map([
      [1, Float32Array.from([1, 0, 0])],
      [2, Float32Array.from([0, 1, 0])],
      [3, Float32Array.from([0, 0, 1])]
    ])
    const relevanceProfile = buildRelevanceProfile({
      ratedArticles,
      articleVectors: vectorsForTraining,
      topicPreferences: new Map(),
      topicVectors: new Map()
    })

    const trainingSamples = buildTrainingSamples(relevanceProfile, ratedArticles, vectorsForTraining, REFERENCE_TIME)

    expect(trainingSamples).toHaveLength(3)
    const [firstLike, dislike] = trainingSamples
    expect(firstLike.isPositive).toBe(true)
    expect(firstLike.features[0]).toBeCloseTo(0)
    expect(firstLike.features[1]).toBeCloseTo(0)
    expect(firstLike.features[2]).toBeCloseTo(smoothSourceAffinity(1, 0))
    expect(dislike.isPositive).toBe(false)
    expect(dislike.features[0]).toBeCloseTo(0)
    expect(dislike.features[1]).toBe(0)
    expect(dislike.features[2]).toBe(0)
  })
})
