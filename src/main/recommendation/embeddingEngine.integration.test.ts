import { describe, expect, it } from 'vitest'
import { embedTexts } from './embeddingEngine'
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL_REPOSITORY, EMBEDDING_MODEL_REVISION } from './embeddingProvider'
import { isModelCached } from './modelCache'
import { cosineSimilarity } from './vectorMath'

const modelCacheDirectory = process.env.DEVFLUX_TEST_MODEL_CACHE
const modelIdentity = { modelRepository: EMBEDDING_MODEL_REPOSITORY, modelRevision: EMBEDDING_MODEL_REVISION }

describe.skipIf(!modelCacheDirectory)('moteur d embeddings réel (DEVFLUX_TEST_MODEL_CACHE)', () => {
  it('produit des vecteurs normalisés de dimension 384 qui rapprochent les textes proches', async () => {
    const vectors = await embedTexts({
      ...modelIdentity,
      cacheDirectory: modelCacheDirectory as string,
      texts: [
        'Les nouveautés du compilateur Rust et du borrow checker',
        'Rust : gestion de la mémoire sans ramasse-miettes',
        'Recette de la tarte aux pommes traditionnelle'
      ]
    })

    expect(vectors).toHaveLength(3)
    expect(isModelCached(modelCacheDirectory as string, EMBEDDING_MODEL_REPOSITORY, EMBEDDING_MODEL_REVISION)).toBe(true)
    for (const vector of vectors) {
      expect(vector).toHaveLength(EMBEDDING_DIMENSION)
      expect(Math.hypot(...vector)).toBeCloseTo(1, 3)
    }
    expect(cosineSimilarity(vectors[0], vectors[1])).toBeGreaterThan(cosineSimilarity(vectors[0], vectors[2]))
  }, 60000)

  it('découpe plus de 16 textes en lots sans perdre l ordre', async () => {
    const texts = Array.from({ length: 20 }, (_, textIndex) => `Article numéro ${textIndex}`)

    const vectors = await embedTexts({ ...modelIdentity, cacheDirectory: modelCacheDirectory as string, texts })

    expect(vectors).toHaveLength(20)
    const [singleTextVector] = await embedTexts({
      ...modelIdentity,
      cacheDirectory: modelCacheDirectory as string,
      texts: [texts[17]]
    })
    const similarityToSingleText = cosineSimilarity(vectors[17], singleTextVector)
    expect(similarityToSingleText).toBeGreaterThan(0.95)
    expect(similarityToSingleText).toBeGreaterThan(cosineSimilarity(vectors[3], singleTextVector))
  }, 60000)
})
