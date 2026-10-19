import { describe, expect, it } from 'vitest'
import { cosineSimilarity, decodeVector, encodeVector, subtractVector, sumVectors } from './vectorMath'

describe('vectorMath', () => {
  it('encode puis décode un vecteur sans perte', () => {
    const vector = Float32Array.from([0.25, -1.5, 3])

    expect(Array.from(decodeVector(encodeVector(vector)))).toEqual([0.25, -1.5, 3])
  })

  it('calcule la similarité cosinus', () => {
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([1, 0]))).toBeCloseTo(1)
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([0, 1]))).toBeCloseTo(0)
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([-2, 0]))).toBeCloseTo(-1)
    expect(cosineSimilarity(Float32Array.from([0, 0]), Float32Array.from([1, 1]))).toBe(0)
  })

  it('additionne et soustrait des vecteurs', () => {
    const vectorSum = sumVectors([Float32Array.from([1, 2]), Float32Array.from([3, 4])])

    expect(Array.from(vectorSum ?? [])).toEqual([4, 6])
    expect(Array.from(subtractVector(vectorSum as Float32Array, Float32Array.from([1, 2])))).toEqual([3, 4])
    expect(sumVectors([])).toBeNull()
  })
})
