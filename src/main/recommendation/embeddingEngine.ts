import { EMBEDDING_BATCH_SIZE } from './embeddingProvider'

export interface EmbeddingEngineRequest {
  modelRepository: string
  modelRevision: string
  cacheDirectory: string
  texts: string[]
}

export async function embedTexts(
  request: EmbeddingEngineRequest,
  onModelReady?: () => void
): Promise<Float32Array[]> {
  const { env, pipeline } = await import('@huggingface/transformers')
  env.cacheDir = request.cacheDirectory
  const extractor = await pipeline('feature-extraction', request.modelRepository, {
    dtype: 'q8',
    revision: request.modelRevision
  })
  onModelReady?.()
  const vectors: Float32Array[] = []
  try {
    for (let batchStart = 0; batchStart < request.texts.length; batchStart += EMBEDDING_BATCH_SIZE) {
      const batchTexts = request.texts.slice(batchStart, batchStart + EMBEDDING_BATCH_SIZE)
      const batchOutput = await extractor(batchTexts, { pooling: 'mean', normalize: true })
      const dimension = batchOutput.dims[1]
      const batchData = batchOutput.data as Float32Array
      for (let textIndex = 0; textIndex < batchTexts.length; textIndex += 1) {
        vectors.push(batchData.slice(textIndex * dimension, (textIndex + 1) * dimension))
      }
    }
  } finally {
    await extractor.dispose()
  }
  return vectors
}
