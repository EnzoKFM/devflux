export function encodeVector(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength)
}

export function decodeVector(encodedVector: Buffer): Float32Array {
  const copiedBytes = new Uint8Array(encodedVector)
  return new Float32Array(copiedBytes.buffer, 0, copiedBytes.byteLength / Float32Array.BYTES_PER_ELEMENT)
}

export function dotProduct(leftVector: Float32Array, rightVector: Float32Array): number {
  let sum = 0
  for (let index = 0; index < leftVector.length; index += 1) {
    sum += leftVector[index] * rightVector[index]
  }
  return sum
}

export function cosineSimilarity(leftVector: Float32Array, rightVector: Float32Array): number {
  const normProduct = Math.sqrt(dotProduct(leftVector, leftVector) * dotProduct(rightVector, rightVector))
  return normProduct === 0 ? 0 : dotProduct(leftVector, rightVector) / normProduct
}

export function sumVectors(vectors: Float32Array[]): Float32Array | null {
  if (vectors.length === 0) {
    return null
  }
  const vectorSum = new Float32Array(vectors[0].length)
  for (const vector of vectors) {
    for (let index = 0; index < vectorSum.length; index += 1) {
      vectorSum[index] += vector[index]
    }
  }
  return vectorSum
}

export function subtractVector(minuend: Float32Array, subtrahend: Float32Array): Float32Array {
  const difference = new Float32Array(minuend.length)
  for (let index = 0; index < difference.length; index += 1) {
    difference[index] = minuend[index] - subtrahend[index]
  }
  return difference
}
