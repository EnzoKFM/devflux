import { EMBEDDING_DIMENSION } from './embeddingProvider'

export interface EmbeddingWorkerRequest {
  type: 'embed'
  modelRepository: string
  modelRevision: string
  cacheDirectory: string
  texts: string[]
}

export type EmbeddingWorkerResponse =
  | { type: 'model-ready' }
  | { type: 'embeddings'; vectors: Float32Array[] }
  | { type: 'failure'; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseWorkerRequest(message: unknown): EmbeddingWorkerRequest {
  if (
    !isRecord(message) ||
    message.type !== 'embed' ||
    typeof message.modelRepository !== 'string' ||
    typeof message.modelRevision !== 'string' ||
    typeof message.cacheDirectory !== 'string' ||
    !Array.isArray(message.texts) ||
    !message.texts.every((text) => typeof text === 'string')
  ) {
    throw new Error("Requête d'embeddings invalide.")
  }
  return {
    type: 'embed',
    modelRepository: message.modelRepository,
    modelRevision: message.modelRevision,
    cacheDirectory: message.cacheDirectory,
    texts: message.texts as string[]
  }
}

export function isModelReadyMessage(message: unknown): boolean {
  return isRecord(message) && message.type === 'model-ready'
}

export function parseWorkerResponse(message: unknown, expectedVectorCount: number): Float32Array[] {
  if (!isRecord(message)) {
    throw new Error("Réponse du processus d'embeddings invalide.")
  }
  if (message.type === 'failure') {
    throw new Error(
      typeof message.message === 'string' ? message.message : "Échec du processus d'embeddings."
    )
  }
  if (message.type !== 'embeddings' || !Array.isArray(message.vectors)) {
    throw new Error("Réponse du processus d'embeddings invalide.")
  }
  if (message.vectors.length !== expectedVectorCount) {
    throw new Error(
      `Le processus d'embeddings a renvoyé ${message.vectors.length} vecteurs au lieu de ${expectedVectorCount}.`
    )
  }
  for (const vector of message.vectors) {
    if (!(vector instanceof Float32Array) || vector.length !== EMBEDDING_DIMENSION || !vector.every(Number.isFinite)) {
      throw new Error(`Le processus d'embeddings a renvoyé un vecteur invalide (dimension attendue ${EMBEDDING_DIMENSION}).`)
    }
  }
  return message.vectors as Float32Array[]
}
