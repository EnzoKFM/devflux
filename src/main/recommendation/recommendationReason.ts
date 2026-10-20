import type { RecommendationSignal } from '@shared/contract'
import { computeFeatureContributions, type LogisticRegressionModel } from './logisticRegression'
import { computeSimilarityContributions, toFeatureVector, type RelevanceFeatures } from './scoring'

const FEATURE_SIGNALS: readonly RecommendationSignal[] = ['similar-content', 'avoids-dislikes', 'liked-source', 'freshness']

export function resolveDominantSignal(
  relevanceFeatures: RelevanceFeatures,
  trainedModel: LogisticRegressionModel | null
): RecommendationSignal {
  const featureContributions = trainedModel
    ? computeFeatureContributions(trainedModel, toFeatureVector(relevanceFeatures))
    : computeSimilarityContributions(relevanceFeatures)
  let dominantFeatureIndex = 0
  featureContributions.forEach((featureContribution, featureIndex) => {
    if (featureContribution > featureContributions[dominantFeatureIndex]) {
      dominantFeatureIndex = featureIndex
    }
  })
  return FEATURE_SIGNALS[dominantFeatureIndex]
}
