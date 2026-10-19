import { describe, expect, it } from 'vitest'
import { cleanSummary, SUMMARY_MAX_LENGTH } from './summaryCleaner'

describe('cleanSummary', () => {
  it('retire le HTML, décode les entités et compacte les espaces', () => {
    expect(cleanSummary('<p>Un   <strong>test</strong>\n&amp; la suite&nbsp;!</p><script>alert(1)</script>')).toBe(
      'Un test & la suite !'
    )
  })

  it('tronque à 280 caractères avec une ellipse', () => {
    const cleanedSummary = cleanSummary('a'.repeat(500)) as string
    expect(cleanedSummary).toHaveLength(SUMMARY_MAX_LENGTH)
    expect(cleanedSummary.endsWith('…')).toBe(true)
  })

  it('renvoie null pour un résumé vide', () => {
    expect(cleanSummary('  <br/> ')).toBeNull()
    expect(cleanSummary(undefined)).toBeNull()
  })
})
