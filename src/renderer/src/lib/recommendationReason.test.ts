import { describe, expect, it } from 'vitest'
import type { RecommendationReason, RecommendationSignal } from '@shared/contract'
import { describeRecommendationMode } from './recommendationMode'
import { describeRecommendationReason, describeRecommendationSignal } from './recommendationReason'

describe('describeRecommendationSignal', () => {
  const expectedLabelsBySignal: Record<RecommendationSignal, string> = {
    'similar-content': 'contenu proche de vos 👍 et de vos sujets suivis',
    'avoids-dislikes': 'éloigné de ce que vous avez écarté',
    'liked-source': 'source que vous appréciez',
    freshness: 'article récent',
    exploration: 'exploration hors de vos habitudes',
    recency: 'articles les plus récents, une source à la fois'
  }

  it.each(Object.entries(expectedLabelsBySignal))('décrit le signal %s', (signal, expectedLabel) => {
    expect(describeRecommendationSignal(signal as RecommendationSignal)).toBe(expectedLabel)
  })
})

describe('describeRecommendationReason', () => {
  it('compose le mode, le sujet le plus proche et le signal dominant', () => {
    const recommendationReason: RecommendationReason = {
      mode: 'similarity',
      closestTopicLabel: 'Python',
      dominantSignal: 'similar-content'
    }

    expect(describeRecommendationReason(recommendationReason)).toEqual({
      modeDescription: describeRecommendationMode('similarity'),
      closestTopicDescription: 'Proche du sujet Python',
      dominantSignalDescription: 'Raison principale : contenu proche de vos 👍 et de vos sujets suivis'
    })
  })

  it('omet le mode et le sujet quand ils sont absents', () => {
    const recommendationReason: RecommendationReason = {
      mode: null,
      closestTopicLabel: null,
      dominantSignal: 'recency'
    }

    expect(describeRecommendationReason(recommendationReason)).toEqual({
      modeDescription: null,
      closestTopicDescription: null,
      dominantSignalDescription: 'Raison principale : articles les plus récents, une source à la fois'
    })
  })
})
