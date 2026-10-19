import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { isModelCached } from './modelCache'

const MODEL_REPOSITORY = 'Xenova/modele-test'
const MODEL_REVISION = 'revision-test'
const cacheDirectories: string[] = []

function createCacheDirectory(): string {
  const cacheDirectory = mkdtempSync(join(tmpdir(), 'devflux-model-cache-'))
  cacheDirectories.push(cacheDirectory)
  return cacheDirectory
}

function writeModelFile(cacheDirectory: string, relativePath: string): void {
  const filePath = join(cacheDirectory, MODEL_REPOSITORY, MODEL_REVISION, relativePath)
  mkdirSync(join(filePath, '..'), { recursive: true })
  writeFileSync(filePath, 'contenu')
}

afterEach(() => {
  for (const cacheDirectory of cacheDirectories.splice(0)) {
    rmSync(cacheDirectory, { recursive: true, force: true })
  }
})

describe('isModelCached', () => {
  it('est faux pour un cache vide', () => {
    expect(isModelCached(createCacheDirectory(), MODEL_REPOSITORY, MODEL_REVISION)).toBe(false)
  })

  it('est faux tant qu il manque un fichier du modèle', () => {
    const cacheDirectory = createCacheDirectory()
    writeModelFile(cacheDirectory, 'config.json')
    writeModelFile(cacheDirectory, 'tokenizer.json')
    writeModelFile(cacheDirectory, 'tokenizer_config.json')

    expect(isModelCached(cacheDirectory, MODEL_REPOSITORY, MODEL_REVISION)).toBe(false)
  })

  it('est vrai quand tous les fichiers du modèle quantifié sont présents', () => {
    const cacheDirectory = createCacheDirectory()
    for (const relativePath of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx']) {
      writeModelFile(cacheDirectory, relativePath)
    }

    expect(isModelCached(cacheDirectory, MODEL_REPOSITORY, MODEL_REVISION)).toBe(true)
  })

  it('est faux quand les fichiers appartiennent à une autre révision', () => {
    const cacheDirectory = createCacheDirectory()
    for (const relativePath of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx']) {
      writeModelFile(cacheDirectory, relativePath)
    }

    expect(isModelCached(cacheDirectory, MODEL_REPOSITORY, 'autre-revision')).toBe(false)
  })
})
