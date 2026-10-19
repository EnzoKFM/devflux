const FRENCH_FUNCTION_WORDS = new Set([
  'le',
  'la',
  'les',
  'l',
  'un',
  'une',
  'des',
  'du',
  'de',
  'd',
  'au',
  'aux',
  'et',
  'ou',
  'est',
  'sont',
  'pour',
  'avec',
  'dans',
  'sur',
  'par',
  'sans',
  'qui',
  'que',
  'qu',
  'ce',
  'cette',
  'ces',
  'nous',
  'vous',
  'pas',
  'plus',
  'mais',
  'comment',
  'pourquoi'
])

const ENGLISH_FUNCTION_WORDS = new Set([
  'the',
  'and',
  'of',
  'to',
  'in',
  'is',
  'are',
  'for',
  'with',
  'from',
  'by',
  'this',
  'that',
  'it',
  'at',
  'be',
  'you',
  'your',
  'we',
  'our',
  'how',
  'what',
  'why',
  'not',
  'but'
])

const MIN_FRENCH_FUNCTION_WORD_COUNT = 2

export function isFrenchText(text: string): boolean {
  let frenchFunctionWordCount = 0
  let englishFunctionWordCount = 0
  for (const word of text.toLowerCase().split(/[^\p{L}]+/u)) {
    if (FRENCH_FUNCTION_WORDS.has(word)) {
      frenchFunctionWordCount += 1
    } else if (ENGLISH_FUNCTION_WORDS.has(word)) {
      englishFunctionWordCount += 1
    }
  }
  return frenchFunctionWordCount >= MIN_FRENCH_FUNCTION_WORD_COUNT && frenchFunctionWordCount > englishFunctionWordCount
}
