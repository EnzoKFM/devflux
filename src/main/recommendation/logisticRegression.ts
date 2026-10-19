export interface TrainingSample {
  features: number[]
  isPositive: boolean
}

export interface LogisticRegressionModel {
  featureMeans: number[]
  featureScales: number[]
  weights: number[]
  bias: number
}

export const LOGISTIC_REGRESSION_LEARNING_RATE = 0.5
export const LOGISTIC_REGRESSION_ITERATION_COUNT = 400
export const LOGISTIC_REGRESSION_L2_PENALTY = 0.01

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value))
}

function standardize(features: number[], featureMeans: number[], featureScales: number[]): number[] {
  return features.map((feature, featureIndex) => (feature - featureMeans[featureIndex]) / featureScales[featureIndex])
}

export function predictProbability(model: LogisticRegressionModel, features: number[]): number {
  const standardizedFeatures = standardize(features, model.featureMeans, model.featureScales)
  const weightedSum = standardizedFeatures.reduce(
    (sum, standardizedFeature, featureIndex) => sum + standardizedFeature * model.weights[featureIndex],
    model.bias
  )
  return sigmoid(weightedSum)
}

export function trainLogisticRegression(trainingSamples: TrainingSample[]): LogisticRegressionModel {
  const featureCount = trainingSamples[0].features.length
  const sampleCount = trainingSamples.length
  const featureMeans: number[] = []
  const featureScales: number[] = []
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex += 1) {
    const featureValues = trainingSamples.map((trainingSample) => trainingSample.features[featureIndex])
    const mean = featureValues.reduce((sum, featureValue) => sum + featureValue, 0) / sampleCount
    const variance =
      featureValues.reduce((sum, featureValue) => sum + (featureValue - mean) ** 2, 0) / sampleCount
    featureMeans.push(mean)
    featureScales.push(Math.sqrt(variance) || 1)
  }

  const standardizedSamples = trainingSamples.map((trainingSample) => ({
    features: standardize(trainingSample.features, featureMeans, featureScales),
    target: trainingSample.isPositive ? 1 : 0
  }))
  const weights = new Array<number>(featureCount).fill(0)
  let bias = 0

  for (let iteration = 0; iteration < LOGISTIC_REGRESSION_ITERATION_COUNT; iteration += 1) {
    const weightGradients = new Array<number>(featureCount).fill(0)
    let biasGradient = 0
    for (const standardizedSample of standardizedSamples) {
      const weightedSum = standardizedSample.features.reduce(
        (sum, feature, featureIndex) => sum + feature * weights[featureIndex],
        bias
      )
      const predictionError = sigmoid(weightedSum) - standardizedSample.target
      standardizedSample.features.forEach((feature, featureIndex) => {
        weightGradients[featureIndex] += predictionError * feature
      })
      biasGradient += predictionError
    }
    for (let featureIndex = 0; featureIndex < featureCount; featureIndex += 1) {
      weights[featureIndex] -=
        LOGISTIC_REGRESSION_LEARNING_RATE *
        (weightGradients[featureIndex] / sampleCount + LOGISTIC_REGRESSION_L2_PENALTY * weights[featureIndex])
    }
    bias -= LOGISTIC_REGRESSION_LEARNING_RATE * (biasGradient / sampleCount)
  }

  return { featureMeans, featureScales, weights, bias }
}
