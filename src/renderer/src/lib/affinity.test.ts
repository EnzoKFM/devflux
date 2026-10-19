import { describe, expect, it } from 'vitest'
import { describeAffinity } from './affinity'

describe('describeAffinity', () => {
  it('décrit une affinité positive', () => {
    expect(describeAffinity(0.5)).toEqual({
      tone: 'positive',
      strengthPercentage: 50,
      label: 'Affinité positive (50 %)'
    })
  })

  it('décrit une affinité négative', () => {
    expect(describeAffinity(-0.25)).toEqual({
      tone: 'negative',
      strengthPercentage: 25,
      label: 'Affinité négative (25 %)'
    })
  })

  it('considère une affinité nulle ou négligeable comme neutre', () => {
    expect(describeAffinity(0).tone).toBe('neutral')
    expect(describeAffinity(0.003).tone).toBe('neutral')
  })

  it('borne les affinités hors de l’intervalle [-1, 1]', () => {
    expect(describeAffinity(3).strengthPercentage).toBe(100)
    expect(describeAffinity(-3).strengthPercentage).toBe(100)
  })
})
