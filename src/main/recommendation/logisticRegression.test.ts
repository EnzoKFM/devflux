import { describe, expect, it } from 'vitest'
import { predictProbability, trainLogisticRegression, type TrainingSample } from './logisticRegression'

function buildSeparableSamples(): TrainingSample[] {
  const samples: TrainingSample[] = []
  for (let sampleIndex = 0; sampleIndex < 10; sampleIndex += 1) {
    const jitter = (sampleIndex % 5) * 0.02
    samples.push({ features: [0.6 + jitter, 0.05 + jitter, 0.2, 0.5], isPositive: true })
    samples.push({ features: [0.05 + jitter, 0.6 + jitter, -0.2, 0.5], isPositive: false })
  }
  return samples
}

describe('régression logistique', () => {
  it('sépare un jeu linéairement séparable', () => {
    const model = trainLogisticRegression(buildSeparableSamples())

    expect(predictProbability(model, [0.62, 0.07, 0.2, 0.5])).toBeGreaterThan(0.9)
    expect(predictProbability(model, [0.07, 0.62, -0.2, 0.5])).toBeLessThan(0.1)
  })

  it('apprend un poids positif pour la similarité positive et négatif pour la similarité négative', () => {
    const model = trainLogisticRegression(buildSeparableSamples())

    expect(model.weights[0]).toBeGreaterThan(0)
    expect(model.weights[1]).toBeLessThan(0)
  })

  it('ne produit pas de valeur non finie quand une caractéristique est constante', () => {
    const model = trainLogisticRegression(buildSeparableSamples())

    expect(Number.isFinite(predictProbability(model, [0.3, 0.3, 0, 0.5]))).toBe(true)
    expect(model.weights.every(Number.isFinite)).toBe(true)
  })
})
