import { describe, expect, it } from 'vitest'
import { describeRecommendationMode } from './recommendationMode'

describe('describeRecommendationMode', () => {
  it('invite à noter des articles en démarrage à froid', () => {
    expect(describeRecommendationMode('cold-start')).toBe(
      'Notez quelques articles ou suivez des sujets pour personnaliser votre fil'
    )
  })

  it('indique la sélection par ressemblance', () => {
    expect(describeRecommendationMode('similarity')).toBe('Sélection par ressemblance avec vos 👍 et vos sujets suivis')
  })

  it('indique que le modèle est entraîné sur les notes de contenu', () => {
    expect(describeRecommendationMode('trained')).toBe('Modèle entraîné sur vos notes de contenu')
  })

  it('signale l’indisponibilité du modèle', () => {
    expect(describeRecommendationMode('unavailable')).toBe(
      'Modèle d’IA indisponible : fil composé sans personnalisation'
    )
  })
})
