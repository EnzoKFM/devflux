import { existsSync } from 'node:fs'
import { join } from 'node:path'

const REQUIRED_MODEL_FILES = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx']

export function isModelCached(cacheDirectory: string, modelRepository: string, modelRevision: string): boolean {
  return REQUIRED_MODEL_FILES.every((modelFile) =>
    existsSync(join(cacheDirectory, modelRepository, modelRevision, modelFile))
  )
}
