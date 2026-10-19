import { describe, expect, it } from 'vitest'
import type { FeedbackReason } from '@shared/contract'
import type { RatedArticle } from '../repositories/feedbackRepository'
import { classifyContentSignal, determineRecommendationMode, resolveSourceVote } from './signals'

function buildRatedArticle(rating: 'like' | 'dislike', reason: FeedbackReason | null, articleId = 1): RatedArticle {
  return {
    articleId,
    sourceKey: '1',
    sourceName: 'Source',
    rating,
    reason,
    title: 'Titre',
    summary: null,
    publishedAt: '2026-10-18T00:00:00.000Z',
    digestDate: null
  }
}

function buildRatings(likeCount: number, dislikeCount: number): RatedArticle[] {
  return [
    ...Array.from({ length: likeCount }, (_, index) => buildRatedArticle('like', null, index + 1)),
    ...Array.from({ length: dislikeCount }, (_, index) => buildRatedArticle('dislike', 'off-topic', 1000 + index))
  ]
}

describe('classifyContentSignal et resolveSourceVote', () => {
  it('traite chaque raison de 👎 selon sa portée', () => {
    expect(classifyContentSignal(buildRatedArticle('like', null))).toBe('positive')
    expect(classifyContentSignal(buildRatedArticle('dislike', null))).toBe('negative')
    expect(classifyContentSignal(buildRatedArticle('dislike', 'off-topic'))).toBe('negative')
    expect(classifyContentSignal(buildRatedArticle('dislike', 'too-basic'))).toBe('negative')
    expect(classifyContentSignal(buildRatedArticle('dislike', 'already-seen'))).toBe('none')
    expect(classifyContentSignal(buildRatedArticle('dislike', 'bad-source'))).toBe('none')

    expect(resolveSourceVote(buildRatedArticle('like', null))).toBe(1)
    expect(resolveSourceVote(buildRatedArticle('dislike', 'off-topic'))).toBe(-1)
    expect(resolveSourceVote(buildRatedArticle('dislike', 'bad-source'))).toBe(-1)
    expect(resolveSourceVote(buildRatedArticle('dislike', 'already-seen'))).toBe(0)
  })
})

describe('determineRecommendationMode', () => {
  it('reste en cold-start sans note ni préférence de sujet', () => {
    expect(determineRecommendationMode({ ratedArticles: [], topicPreferences: new Map() })).toBe('cold-start')
  })

  it('passe en similarité dès une note ou un sujet suivi ou masqué', () => {
    expect(determineRecommendationMode({ ratedArticles: buildRatings(1, 0), topicPreferences: new Map() })).toBe(
      'similarity'
    )
    expect(
      determineRecommendationMode({ ratedArticles: [], topicPreferences: new Map([['rust', 'followed']]) })
    ).toBe('similarity')
    expect(determineRecommendationMode({ ratedArticles: [], topicPreferences: new Map([['rust', 'muted']]) })).toBe(
      'similarity'
    )
  })

  it('passe en mode entraîné à 20 notes de contenu avec au moins 5 de chaque classe', () => {
    expect(determineRecommendationMode({ ratedArticles: buildRatings(15, 5), topicPreferences: new Map() })).toBe(
      'trained'
    )
    expect(determineRecommendationMode({ ratedArticles: buildRatings(14, 5), topicPreferences: new Map() })).toBe(
      'similarity'
    )
    expect(determineRecommendationMode({ ratedArticles: buildRatings(16, 4), topicPreferences: new Map() })).toBe(
      'similarity'
    )
  })

  it('ne compte pas les 👎 déjà vu ou mauvaise source comme notes de contenu', () => {
    const ratedArticles = [
      ...buildRatings(15, 0),
      ...Array.from({ length: 5 }, (_, index) => buildRatedArticle('dislike', 'bad-source', 2000 + index))
    ]

    expect(determineRecommendationMode({ ratedArticles, topicPreferences: new Map() })).toBe('similarity')
  })
})
