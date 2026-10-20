import { describe, expect, it } from 'vitest'
import { countWordsInHtml, READING_TIME_MIN_WORD_COUNT, resolveFeedEntryWordCount } from './wordCount'

function repeatWords(wordCount: number): string {
  return Array.from({ length: wordCount }, (_unused, wordIndex) => `mot${wordIndex}`).join(' ')
}

describe('countWordsInHtml', () => {
  it('compte les mots du texte visible sans les balises, scripts ni ponctuation isolée', () => {
    expect(countWordsInHtml('<p>Un <strong>texte</strong> — avec l&#8217;apostrophe&nbsp;!</p><script>var ignore = 1</script>')).toBe(4)
  })

  it('renvoie 0 pour un contenu absent', () => {
    expect(countWordsInHtml(undefined)).toBe(0)
  })
})

describe('resolveFeedEntryWordCount', () => {
  it('privilégie le contenu complet du flux sur la description', () => {
    expect(
      resolveFeedEntryWordCount({ id: 'a', description: 'Court extrait', fullContent: `<p>${repeatWords(600)}</p>` })
    ).toBe(600)
  })

  it('se rabat sur la description quand elle contient l article entier', () => {
    expect(resolveFeedEntryWordCount({ id: 'a', description: repeatWords(400) })).toBe(400)
  })

  it(`ignore un simple extrait de moins de ${READING_TIME_MIN_WORD_COUNT} mots`, () => {
    expect(resolveFeedEntryWordCount({ id: 'a', description: repeatWords(READING_TIME_MIN_WORD_COUNT - 1) })).toBeNull()
  })
})
