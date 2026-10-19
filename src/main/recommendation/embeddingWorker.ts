import { embedTexts } from './embeddingEngine'
import { parseWorkerRequest, type EmbeddingWorkerResponse } from './embeddingWorkerProtocol'

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function reply(response: EmbeddingWorkerResponse): void {
  process.parentPort.postMessage(response)
}

process.parentPort.on('message', (messageEvent) => {
  void (async () => {
    try {
      const request = parseWorkerRequest(messageEvent.data)
      const vectors = await embedTexts(request, () => reply({ type: 'model-ready' }))
      reply({ type: 'embeddings', vectors })
    } catch (error) {
      reply({ type: 'failure', message: describeError(error) })
    }
  })()
})
