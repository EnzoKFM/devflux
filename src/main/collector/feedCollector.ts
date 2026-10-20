import type Database from 'better-sqlite3'
import type { FeedEntry } from '@extractus/feed-extractor'
import type { Source } from '@shared/contract'
import { insertArticleIfNew } from '../repositories/articleRepository'
import { listEnabledSources, recordFetchFailure, recordFetchSuccess } from '../repositories/sourceRepository'
import { parseHttpUrl } from '../httpUrl'
import { isFrenchArticle } from '../recommendation/languageDetection'
import { computeOldestAllowedPublicationDate } from './articleAge'
import { defaultFeedFetcher, fetchFeedWithTimeout, type FeedFetcher } from './feedFetcher'
import { cleanSummary } from './summaryCleaner'
import { normalizeUrl } from './urlNormalizer'

export const FEED_COLLECTION_CONCURRENCY = 6

export interface CollectionOptions {
  fetchFeed?: FeedFetcher
  now?: () => Date
  onSourceProcessed?: (completedSourceCount: number, totalSourceCount: number) => void
}

export interface CollectionResult {
  succeededSourceCount: number
  failedSourceCount: number
  newArticleCount: number
}

function resolvePublicationDate(entry: FeedEntry, now: Date): Date | null {
  if (!entry.published) {
    return null
  }
  const publicationTimestamp = Date.parse(entry.published)
  if (Number.isNaN(publicationTimestamp)) {
    return null
  }
  return new Date(Math.min(publicationTimestamp, now.getTime()))
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function storeEntries(database: Database.Database, source: Source, entries: FeedEntry[], now: Date): number {
  const oldestAllowedPublicationDate = computeOldestAllowedPublicationDate(now)
  let newArticleCount = 0

  database.transaction(() => {
    for (const entry of entries) {
      const articleUrl = parseHttpUrl(entry.link)
      const title = entry.title?.trim()
      const publicationDate = resolvePublicationDate(entry, now)
      if (!articleUrl || !title || !publicationDate) {
        continue
      }
      const publishedAt = publicationDate.toISOString()
      if (publishedAt < oldestAllowedPublicationDate) {
        continue
      }
      const summary = cleanSummary(entry.description)
      if (!isFrenchArticle(title, summary)) {
        continue
      }
      const isInserted = insertArticleIfNew(database, {
        sourceId: source.id,
        sourceName: source.name,
        url: normalizeUrl(articleUrl.href),
        title,
        summary,
        publishedAt,
        fetchedAt: now.toISOString()
      })
      if (isInserted) {
        newArticleCount += 1
      }
    }
  })()

  return newArticleCount
}

export async function collectFeeds(database: Database.Database, options: CollectionOptions = {}): Promise<CollectionResult> {
  const fetchFeed = options.fetchFeed ?? defaultFeedFetcher
  const now = options.now ?? (() => new Date())
  const sources = listEnabledSources(database)
  const result: CollectionResult = { succeededSourceCount: 0, failedSourceCount: 0, newArticleCount: 0 }
  let completedSourceCount = 0
  let nextSourceIndex = 0

  async function collectSource(source: Source): Promise<void> {
    try {
      const feed = await fetchFeedWithTimeout(source.feedUrl, fetchFeed)
      const collectionDate = now()
      result.newArticleCount += storeEntries(database, source, feed.entries ?? [], collectionDate)
      recordFetchSuccess(database, source.id, collectionDate.toISOString())
      result.succeededSourceCount += 1
    } catch (error) {
      recordFetchFailure(database, source.id, now().toISOString(), describeError(error))
      result.failedSourceCount += 1
    }
    completedSourceCount += 1
    options.onSourceProcessed?.(completedSourceCount, sources.length)
  }

  async function runWorker(): Promise<void> {
    while (nextSourceIndex < sources.length) {
      const source = sources[nextSourceIndex]
      nextSourceIndex += 1
      await collectSource(source)
    }
  }

  const workerCount = Math.min(FEED_COLLECTION_CONCURRENCY, sources.length)
  await Promise.all(Array.from({ length: workerCount }, runWorker))

  return result
}
