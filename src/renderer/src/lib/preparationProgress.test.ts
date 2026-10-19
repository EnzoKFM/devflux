import { describe, expect, it } from 'vitest'
import type { PreparationProgress, PreparationStep } from '@shared/contract'
import { describePreparation } from './preparationProgress'

function progressAt(step: PreparationStep): PreparationProgress {
  return { step, completedSourceCount: 10, totalSourceCount: 10 }
}

describe('describePreparation', () => {
  it('libelle l’étape de téléchargement du modèle', () => {
    expect(describePreparation(progressAt('downloading-model')).label).toBe(
      'Téléchargement du modèle d’IA (une seule fois)…'
    )
  })

  it('libelle l’étape d’analyse des articles', () => {
    expect(describePreparation(progressAt('analyzing')).label).toBe('Analyse des articles…')
  })

  it('fait croître le pourcentage à chaque étape', () => {
    const orderedSteps: PreparationStep[] = [
      'purging',
      'collecting',
      'downloading-model',
      'analyzing',
      'building-digest',
      'done'
    ]
    const percentages = orderedSteps.map((step) => describePreparation(progressAt(step)).percentage)
    expect(percentages).toEqual([...percentages].sort((first, second) => first - second))
    expect(new Set(percentages).size).toBe(orderedSteps.length)
  })
})
