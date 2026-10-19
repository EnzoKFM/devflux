import { describe, expect, it } from 'vitest'
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL_REPOSITORY, EMBEDDING_MODEL_REVISION } from './embeddingProvider'
import type { EmbeddingWorkerRequest } from './embeddingWorkerProtocol'
import { createWorkerEmbeddingProvider, type EmbeddingWorkerHandle } from './workerEmbeddingProvider'

interface FakeWorker extends EmbeddingWorkerHandle {
  receivedRequests: EmbeddingWorkerRequest[]
  killCount: number
  emitMessage(message: unknown): void
  emitExit(exitCode: number | null): void
}

function createFakeWorker(onRequest?: (worker: FakeWorker, request: EmbeddingWorkerRequest) => void): FakeWorker {
  let messageListener: (message: unknown) => void = () => undefined
  let exitListener: (exitCode: number | null) => void = () => undefined
  const worker: FakeWorker = {
    receivedRequests: [],
    killCount: 0,
    postMessage: (request) => {
      worker.receivedRequests.push(request)
      onRequest?.(worker, request)
    },
    onMessage: (listener) => {
      messageListener = listener
    },
    onExit: (listener) => {
      exitListener = listener
    },
    kill: () => {
      worker.killCount += 1
    },
    emitMessage: (message) => messageListener(message),
    emitExit: (exitCode) => exitListener(exitCode)
  }
  return worker
}

function buildVectors(vectorCount: number): Float32Array[] {
  return Array.from({ length: vectorCount }, () => new Float32Array(EMBEDDING_DIMENSION).fill(0.05))
}

function createProvider(worker: FakeWorker, timeoutMilliseconds = 1000) {
  return createWorkerEmbeddingProvider({
    forkWorker: () => worker,
    cacheDirectory: '/chemin/inexistant/models',
    downloadTimeoutMilliseconds: timeoutMilliseconds,
    computationTimeoutMilliseconds: timeoutMilliseconds
  })
}

describe('createWorkerEmbeddingProvider', () => {
  it('envoie les textes au processus, renvoie les vecteurs puis termine le processus', async () => {
    const worker = createFakeWorker((fakeWorker, request) =>
      queueMicrotask(() => fakeWorker.emitMessage({ type: 'embeddings', vectors: buildVectors(request.texts.length) }))
    )

    const vectors = await createProvider(worker).embed(['premier', 'second'])

    expect(vectors).toHaveLength(2)
    expect(worker.receivedRequests[0]).toMatchObject({
      type: 'embed',
      modelRepository: EMBEDDING_MODEL_REPOSITORY,
      modelRevision: EMBEDDING_MODEL_REVISION,
      texts: ['premier', 'second']
    })
    expect(worker.killCount).toBe(1)
  })

  it('signale le modèle prêt sans terminer l attente puis renvoie les vecteurs', async () => {
    const worker = createFakeWorker()
    let isModelReady = false
    let hasSettled = false

    const embeddingPromise = createProvider(worker)
      .embed(['a'], { onModelReady: () => (isModelReady = true) })
      .finally(() => (hasSettled = true))
    worker.emitMessage({ type: 'model-ready' })
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(isModelReady).toBe(true)
    expect(hasSettled).toBe(false)
    worker.emitMessage({ type: 'embeddings', vectors: buildVectors(1) })
    expect(await embeddingPromise).toHaveLength(1)
    expect(worker.killCount).toBe(1)
  })

  it('applique le délai de téléchargement même après le signal du modèle prêt', async () => {
    const worker = createFakeWorker()

    const embeddingPromise = createProvider(worker, 30).embed(['a'])
    worker.emitMessage({ type: 'model-ready' })

    await expect(embeddingPromise).rejects.toThrow('dépassé')
    expect(worker.killCount).toBe(1)
  })

  it('ne lance aucun processus pour une liste de textes vide', async () => {
    const worker = createFakeWorker()

    expect(await createProvider(worker).embed([])).toEqual([])
    expect(worker.receivedRequests).toHaveLength(0)
    expect(worker.killCount).toBe(0)
  })

  it('rejette et termine le processus quand le message reçu est invalide', async () => {
    const worker = createFakeWorker((fakeWorker) =>
      queueMicrotask(() => fakeWorker.emitMessage({ type: 'embeddings', vectors: buildVectors(1) }))
    )

    await expect(createProvider(worker).embed(['a', 'b'])).rejects.toThrow('1 vecteurs au lieu de 2')
    expect(worker.killCount).toBe(1)
  })

  it('rejette quand le processus signale un échec', async () => {
    const worker = createFakeWorker((fakeWorker) =>
      queueMicrotask(() => fakeWorker.emitMessage({ type: 'failure', message: 'téléchargement impossible' }))
    )

    await expect(createProvider(worker).embed(['a'])).rejects.toThrow('téléchargement impossible')
    expect(worker.killCount).toBe(1)
  })

  it('rejette quand le processus s arrête sans répondre', async () => {
    const worker = createFakeWorker((fakeWorker) => queueMicrotask(() => fakeWorker.emitExit(137)))

    await expect(createProvider(worker).embed(['a'])).rejects.toThrow('code 137')
    expect(worker.killCount).toBe(1)
  })

  it('rejette au bout du délai et termine le processus', async () => {
    const worker = createFakeWorker()

    await expect(createProvider(worker, 20).embed(['a'])).rejects.toThrow('dépassé')
    expect(worker.killCount).toBe(1)
  })

  it('signale qu un téléchargement est nécessaire tant que le modèle n est pas en cache', () => {
    expect(createProvider(createFakeWorker()).isModelDownloadRequired()).toBe(true)
  })
})
