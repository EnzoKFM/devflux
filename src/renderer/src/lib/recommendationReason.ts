import type { RecommendationReason, RecommendationSignal } from '@shared/contract'
import { describeRecommendationMode } from './recommendationMode'

export interface RecommendationReasonDescription {
  modeDescription: string | null
  closestTopicDescription: string | null
  dominantSignalDescription: string
}

export function describeRecommendationSignal(signal: RecommendationSignal): string {
  switch (signal) {
    case 'similar-content':
      return 'contenu proche de vos 👍 et de vos sujets suivis'
    case 'avoids-dislikes':
      return 'éloigné de ce que vous avez écarté'
    case 'liked-source':
      return 'source que vous appréciez'
    case 'freshness':
      return 'article récent'
    case 'exploration':
      return 'exploration hors de vos habitudes'
    case 'recency':
      return 'articles les plus récents, une source à la fois'
  }
}

export function describeRecommendationReason(recommendationReason: RecommendationReason): RecommendationReasonDescription {
  return {
    modeDescription: recommendationReason.mode === null ? null : describeRecommendationMode(recommendationReason.mode),
    closestTopicDescription:
      recommendationReason.closestTopicLabel === null
        ? null
        : `Proche du sujet ${recommendationReason.closestTopicLabel}`,
    dominantSignalDescription: `Raison principale : ${describeRecommendationSignal(recommendationReason.dominantSignal)}`
  }
}
