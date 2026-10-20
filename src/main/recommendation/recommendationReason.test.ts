import { describe, expect, it } from 'vitest'
import type { LogisticRegressionModel } from './logisticRegression'
import { resolveDominantSignal } from './recommendationReason'

describe('resolveDominantSignal', () => {
  it('retient en mode similarité la proximité avec vos goûts quand elle pèse le plus', () => {
    expect(
      resolveDominantSignal({ positiveSimilarity: 0.6, negativeSimilarity: 0.1, sourceAffinity: 0.5, freshness: 1 }, null)
    ).toBe('similar-content')
  })

  it('retient en mode similarité la source appréciée quand elle pèse plus que le contenu', () => {
    expect(
      resolveDominantSignal({ positiveSimilarity: 0.02, negativeSimilarity: 0, sourceAffinity: 0.8, freshness: 0.5 }, null)
    ).toBe('liked-source')
  })

  it('retient la fraîcheur quand aucun autre signal ne contribue', () => {
    expect(
      resolveDominantSignal({ positiveSimilarity: 0, negativeSimilarity: 0, sourceAffinity: 0, freshness: 0.9 }, null)
    ).toBe('freshness')
  })

  it('pondère en mode entraîné chaque caractéristique standardisée par son poids appris', () => {
    const trainedModel: LogisticRegressionModel = {
      featureMeans: [0.3, 0.3, 0, 0.5],
      featureScales: [0.1, 0.1, 0.1, 0.1],
      weights: [0.5, -2, 0.1, 0.1],
      bias: 0
    }

    expect(
      resolveDominantSignal({ positiveSimilarity: 0.4, negativeSimilarity: 0.1, sourceAffinity: 0, freshness: 0.5 }, trainedModel)
    ).toBe('avoids-dislikes')
  })
})
