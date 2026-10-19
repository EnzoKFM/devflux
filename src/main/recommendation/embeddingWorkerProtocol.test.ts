import { describe, expect, it } from 'vitest'
import { EMBEDDING_DIMENSION } from './embeddingProvider'
import { deserialize, serialize } from 'node:v8'
import { isModelReadyMessage, parseWorkerRequest, parseWorkerResponse } from './embeddingWorkerProtocol'

function buildVector(fillValue = 0.1): Float32Array {
  return new Float32Array(EMBEDDING_DIMENSION).fill(fillValue)
}

describe('parseWorkerResponse', () => {
  it('accepte des vecteurs de la bonne forme', () => {
    const vectors = parseWorkerResponse({ type: 'embeddings', vectors: [buildVector(), buildVector(0.2)] }, 2)

    expect(vectors).toHaveLength(2)
  })

  it('refuse un nombre de vecteurs différent du nombre de textes', () => {
    expect(() => parseWorkerResponse({ type: 'embeddings', vectors: [buildVector()] }, 2)).toThrow('1 vecteurs au lieu de 2')
  })

  it('refuse un vecteur de mauvaise dimension, non typé ou non fini', () => {
    expect(() => parseWorkerResponse({ type: 'embeddings', vectors: [new Float32Array(3)] }, 1)).toThrow('invalide')
    expect(() => parseWorkerResponse({ type: 'embeddings', vectors: [Array(EMBEDDING_DIMENSION).fill(0.1)] }, 1)).toThrow(
      'invalide'
    )
    expect(() => parseWorkerResponse({ type: 'embeddings', vectors: [buildVector(Number.NaN)] }, 1)).toThrow('invalide')
  })

  it('accepte les vecteurs après une sérialisation structurée et v8', () => {
    const response = { type: 'embeddings', vectors: [buildVector(), buildVector(0.2)] }

    for (const transportedResponse of [structuredClone(response), deserialize(serialize(response))]) {
      const vectors = parseWorkerResponse(transportedResponse, 2)

      expect(vectors).toHaveLength(2)
      expect(vectors[1][0]).toBeCloseTo(0.2, 5)
    }
  })

  it('relaie le message d un échec du processus', () => {
    expect(() => parseWorkerResponse({ type: 'failure', message: 'réseau coupé' }, 1)).toThrow('réseau coupé')
  })

  it('refuse tout autre message', () => {
    for (const invalidMessage of [null, 'texte', 42, {}, { type: 'autre' }, { type: 'embeddings' }]) {
      expect(() => parseWorkerResponse(invalidMessage, 1)).toThrow()
    }
  })
})

describe('isModelReadyMessage', () => {
  it('reconnaît uniquement le message de modèle prêt', () => {
    expect(isModelReadyMessage({ type: 'model-ready' })).toBe(true)
    for (const otherMessage of [null, 'model-ready', {}, { type: 'embeddings', vectors: [] }]) {
      expect(isModelReadyMessage(otherMessage)).toBe(false)
    }
  })

  it('n est pas une réponse valide d embeddings', () => {
    expect(() => parseWorkerResponse({ type: 'model-ready' }, 1)).toThrow('invalide')
  })
})

describe('parseWorkerRequest', () => {
  it('accepte une requête bien formée', () => {
    expect(
      parseWorkerRequest({ type: 'embed', modelRepository: 'depot/modele', modelRevision: 'abc123', cacheDirectory: '/tmp/cache', texts: ['a', 'b'] })
    ).toEqual({ type: 'embed', modelRepository: 'depot/modele', modelRevision: 'abc123', cacheDirectory: '/tmp/cache', texts: ['a', 'b'] })
  })

  it('refuse une requête mal formée', () => {
    expect(() => parseWorkerRequest({ type: 'embed', modelRepository: 'm', modelRevision: 'r', cacheDirectory: '/c', texts: [1] })).toThrow()
    expect(() => parseWorkerRequest({ type: 'embed', modelRepository: 'm', modelRevision: 'r', texts: [] })).toThrow()
    expect(() => parseWorkerRequest(null)).toThrow()
  })
})
