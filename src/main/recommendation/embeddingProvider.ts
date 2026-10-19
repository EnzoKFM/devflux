export const EMBEDDING_MODEL_REPOSITORY = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
export const EMBEDDING_MODEL_REVISION = '2c4055b12046f11709e9df2c122e59ffbdc2f900'
export const EMBEDDING_MODEL_ID = `${EMBEDDING_MODEL_REPOSITORY}@${EMBEDDING_MODEL_REVISION}`
export const EMBEDDING_DIMENSION = 384
export const EMBEDDING_BATCH_SIZE = 16

export interface EmbedOptions {
  onModelReady?: () => void
}

export interface EmbeddingProvider {
  readonly modelId: string
  isModelDownloadRequired(): boolean
  embed(texts: string[], options?: EmbedOptions): Promise<Float32Array[]>
}
