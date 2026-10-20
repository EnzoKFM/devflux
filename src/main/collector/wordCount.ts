import type { CollectedFeedEntry } from './feedFetcher'
import { extractPlainText } from './summaryCleaner'

export const READING_TIME_MIN_WORD_COUNT = 150

export function countWordsInHtml(rawHtml: string | undefined): number {
  return extractPlainText(rawHtml)
    .split(' ')
    .filter((textToken) => /[\p{L}\p{N}]/u.test(textToken)).length
}

export function toReadingWordCount(wordCount: number): number | null {
  return wordCount >= READING_TIME_MIN_WORD_COUNT ? wordCount : null
}

export function resolveFeedEntryWordCount(entry: CollectedFeedEntry): number | null {
  return toReadingWordCount(countWordsInHtml(entry.fullContent ?? entry.description))
}
