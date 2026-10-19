import type { RecommendationMode } from '@shared/contract'

export function describeRecommendationMode(mode: RecommendationMode): string {
  switch (mode) {
    case 'cold-start':
      return 'Notez quelques articles ou suivez des sujets pour personnaliser votre fil'
    case 'similarity':
      return 'Sélection par ressemblance avec vos 👍 et vos sujets suivis'
    case 'trained':
      return 'Modèle entraîné sur vos notes de contenu'
    case 'unavailable':
      return 'Modèle d’IA indisponible : fil composé sans personnalisation'
  }
}
