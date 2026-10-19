import type { PreparationProgress } from '@shared/contract'

export interface PreparationDisplay {
  label: string
  percentage: number
}

const PURGING_PERCENTAGE = 5
const COLLECTING_SPAN_PERCENTAGE = 80
const BUILDING_DIGEST_PERCENTAGE = 92
const DONE_PERCENTAGE = 100

export function describePreparation(progress: PreparationProgress | null): PreparationDisplay {
  if (progress === null || progress.step === 'purging') {
    return { label: 'Nettoyage des anciens articles…', percentage: PURGING_PERCENTAGE }
  }

  if (progress.step === 'collecting') {
    const collectedRatio =
      progress.totalSourceCount > 0 ? progress.completedSourceCount / progress.totalSourceCount : 0
    return {
      label: `Récupération des flux ${progress.completedSourceCount}/${progress.totalSourceCount}…`,
      percentage: Math.round(PURGING_PERCENTAGE + COLLECTING_SPAN_PERCENTAGE * collectedRatio)
    }
  }

  if (progress.step === 'building-digest') {
    return { label: 'Sélection du fil du jour…', percentage: BUILDING_DIGEST_PERCENTAGE }
  }

  return { label: 'Fil du jour prêt', percentage: DONE_PERCENTAGE }
}
