export type AffinityTone = 'positive' | 'negative' | 'neutral'

export interface AffinityDisplay {
  tone: AffinityTone
  strengthPercentage: number
  label: string
}

const MAXIMUM_AFFINITY = 1

export function describeAffinity(affinity: number): AffinityDisplay {
  const clampedAffinity = Math.max(-MAXIMUM_AFFINITY, Math.min(MAXIMUM_AFFINITY, affinity))
  const strengthPercentage = Math.round((Math.abs(clampedAffinity) / MAXIMUM_AFFINITY) * 100)

  if (strengthPercentage === 0) {
    return { tone: 'neutral', strengthPercentage, label: 'Affinité neutre' }
  }

  if (clampedAffinity > 0) {
    return { tone: 'positive', strengthPercentage, label: `Affinité positive (${strengthPercentage} %)` }
  }

  return { tone: 'negative', strengthPercentage, label: `Affinité négative (${strengthPercentage} %)` }
}
