export const READING_WORDS_PER_MINUTE = 230

export function formatReadingTime(wordCount: number | null): string | null {
  if (wordCount === null) {
    return null
  }
  const readingMinutes = Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE))
  return `${readingMinutes} min de lecture`
}
