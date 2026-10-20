import { describe, expect, it } from 'vitest'
import { READING_WORDS_PER_MINUTE, formatReadingTime } from './readingTime'

describe('formatReadingTime', () => {
  it('ne renvoie rien quand le nombre de mots est inconnu', () => {
    expect(formatReadingTime(null)).toBeNull()
  })

  it('arrondit au supérieur', () => {
    expect(formatReadingTime(READING_WORDS_PER_MINUTE + 1)).toBe('2 min de lecture')
  })

  it('conserve la minute exacte sans arrondi', () => {
    expect(formatReadingTime(READING_WORDS_PER_MINUTE * 3)).toBe('3 min de lecture')
  })

  it('affiche au minimum 1 minute', () => {
    expect(formatReadingTime(0)).toBe('1 min de lecture')
    expect(formatReadingTime(12)).toBe('1 min de lecture')
  })
})
