import { describe, expect, it } from 'vitest'
import { describeSourcesImportReport } from './sourcesImportReport'

describe('describeSourcesImportReport', () => {
  it('annonce les sources importées seules', () => {
    expect(describeSourcesImportReport({ importedCount: 3, skippedCount: 0, rejectedCount: 0 })).toBe('3 sources importées')
  })

  it('détaille les sources déjà présentes et les adresses écartées', () => {
    expect(describeSourcesImportReport({ importedCount: 1, skippedCount: 2, rejectedCount: 1 })).toBe(
      '1 source importée, 2 déjà présentes ignorées, 1 adresse invalide écartée'
    )
  })
})
