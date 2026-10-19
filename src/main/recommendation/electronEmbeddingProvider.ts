import { utilityProcess } from 'electron'
import {
  createWorkerEmbeddingProvider,
  type EmbeddingWorkerHandle
} from './workerEmbeddingProvider'
import type { EmbeddingProvider } from './embeddingProvider'

function forkUtilityWorker(workerPath: string): EmbeddingWorkerHandle {
  const workerProcess = utilityProcess.fork(workerPath, [], { serviceName: 'devflux-embeddings' })
  return {
    postMessage: (message) => workerProcess.postMessage(message),
    onMessage: (listener) => {
      workerProcess.on('message', listener)
    },
    onExit: (listener) => {
      workerProcess.on('exit', listener)
    },
    kill: () => {
      workerProcess.kill()
    }
  }
}

export function createElectronEmbeddingProvider(workerPath: string, cacheDirectory: string): EmbeddingProvider {
  return createWorkerEmbeddingProvider({ forkWorker: () => forkUtilityWorker(workerPath), cacheDirectory })
}
