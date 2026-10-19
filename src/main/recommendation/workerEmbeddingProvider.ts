import {
  EMBEDDING_MODEL_ID,
  EMBEDDING_MODEL_REPOSITORY,
  EMBEDDING_MODEL_REVISION,
  type EmbedOptions,
  type EmbeddingProvider
} from './embeddingProvider'
import { isModelCached } from './modelCache'
import { isModelReadyMessage, parseWorkerResponse, type EmbeddingWorkerRequest } from './embeddingWorkerProtocol'

export const EMBEDDING_COMPUTATION_TIMEOUT_MILLISECONDS = 3 * 60 * 1000
export const EMBEDDING_DOWNLOAD_TIMEOUT_MILLISECONDS = 15 * 60 * 1000

export interface EmbeddingWorkerHandle {
  postMessage(message: EmbeddingWorkerRequest): void
  onMessage(listener: (message: unknown) => void): void
  onExit(listener: (exitCode: number | null) => void): void
  kill(): void
}

export interface WorkerEmbeddingProviderOptions {
  forkWorker: () => EmbeddingWorkerHandle
  cacheDirectory: string
  computationTimeoutMilliseconds?: number
  downloadTimeoutMilliseconds?: number
}

export function createWorkerEmbeddingProvider(options: WorkerEmbeddingProviderOptions): EmbeddingProvider {
  const isModelDownloadRequired = (): boolean =>
    !isModelCached(options.cacheDirectory, EMBEDDING_MODEL_REPOSITORY, EMBEDDING_MODEL_REVISION)

  return {
    modelId: EMBEDDING_MODEL_ID,
    isModelDownloadRequired,
    async embed(texts: string[], embedOptions?: EmbedOptions): Promise<Float32Array[]> {
      if (texts.length === 0) {
        return []
      }
      const timeoutMilliseconds = isModelDownloadRequired()
        ? (options.downloadTimeoutMilliseconds ?? EMBEDDING_DOWNLOAD_TIMEOUT_MILLISECONDS)
        : (options.computationTimeoutMilliseconds ?? EMBEDDING_COMPUTATION_TIMEOUT_MILLISECONDS)
      const workerHandle = options.forkWorker()
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined

      try {
        return await new Promise<Float32Array[]>((resolve, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`Le calcul des embeddings a dépassé ${Math.round(timeoutMilliseconds / 1000)} s.`)),
            timeoutMilliseconds
          )
          workerHandle.onExit((exitCode) =>
            reject(new Error(`Le processus d'embeddings s'est arrêté (code ${exitCode ?? 'inconnu'}).`))
          )
          workerHandle.onMessage((message) => {
            if (isModelReadyMessage(message)) {
              embedOptions?.onModelReady?.()
              return
            }
            try {
              resolve(parseWorkerResponse(message, texts.length))
            } catch (error) {
              reject(error)
            }
          })
          workerHandle.postMessage({
            type: 'embed',
            modelRepository: EMBEDDING_MODEL_REPOSITORY,
            modelRevision: EMBEDDING_MODEL_REVISION,
            cacheDirectory: options.cacheDirectory,
            texts
          })
        })
      } finally {
        clearTimeout(timeoutHandle)
        workerHandle.kill()
      }
    }
  }
}
