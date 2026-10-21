import type Database from 'better-sqlite3'
import type { Source } from '@shared/contract'
import { extractArticleContent, type PageFetcher } from '../reader/articleExtractor'
import {
  findStoredArticleTextByUrl,
  insertArticleIfNew,
  updateArticleText,
  type NewArticle
} from '../repositories/articleRepository'
import { deleteArticleEmbedding } from '../repositories/embeddingRepository'
import { listEnabledSources, recordFetchFailure, recordFetchSuccess } from '../repositories/sourceRepository'
import { parseHttpUrl } from '../httpUrl'
import { isFrenchArticle, isFrenchText } from '../recommendation/languageDetection'
import { computeOldestAllowedPublicationDate } from './articleAge'
import { mapWithBoundedConcurrency } from './boundedConcurrency'
import { defaultFeedFetcher, fetchFeedWithTimeout, type CollectedFeedEntry, type FeedFetcher } from './feedFetcher'
import { cleanSummary, extractPlainText } from './summaryCleaner'
import { normalizeUrl } from './urlNormalizer'
import { resolveFeedEntryWordCount } from './wordCount'

export const FEED_COLLECTION_CONCURRENCY = 6
export const PAGE_VERIFICATION_CONCURRENCY = 4

export interface CollectionOptions {
  fetchFeed?: FeedFetcher
  fetchPage?: PageFetcher
  now?: () => Date
  onSourceProcessed?: (completedSourceCount: number, totalSourceCount: number) => void
}

export interface CollectionResult {
  succeededSourceCount: number
  failedSourceCount: number
  newArticleCount: number
}

function resolvePublicationDate(entry: CollectedFeedEntry, now: Date): Date | null {
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

function selectCandidateArticles(source: Source, entries: CollectedFeedEntry[], now: Date): NewArticle[] {
  const oldestAllowedPublicationDate = computeOldestAllowedPublicationDate(now)
  const candidateArticles = new Map<string, NewArticle>()

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
    const normalizedUrl = normalizeUrl(articleUrl.href)
    if (candidateArticles.has(normalizedUrl)) {
      continue
    }
    candidateArticles.set(normalizedUrl, {
      sourceId: source.id,
      sourceName: source.name,
      url: normalizedUrl,
      title,
      summary,
      publishedAt,
      fetchedAt: now.toISOString(),
      wordCount: resolveFeedEntryWordCount(entry)
    })
  }

  return [...candidateArticles.values()]
}

async function isPageInFrench(newArticle: NewArticle, fetchPage: PageFetcher | undefined): Promise<boolean> {
  const { contentHtml } = await extractArticleContent(
    { articleId: 0, title: newArticle.title, url: newArticle.url },
    fetchPage
  )
  return contentHtml !== null && isFrenchText(extractPlainText(contentHtml))
}

async function keepArticlesWithFrenchPage(
  newArticles: NewArticle[],
  fetchPage: PageFetcher | undefined
): Promise<NewArticle[]> {
  const frenchPageFlags = await mapWithBoundedConcurrency(newArticles, PAGE_VERIFICATION_CONCURRENCY, (newArticle) =>
    isPageInFrench(newArticle, fetchPage)
  )

  return newArticles.filter((_newArticle, articleIndex) => frenchPageFlags[articleIndex])
}

async function storeEntries(
  database: Database.Database,
  source: Source,
  entries: CollectedFeedEntry[],
  now: Date,
  fetchPage: PageFetcher | undefined
): Promise<number> {
  const newArticles: NewArticle[] = []
  const articlesToRefresh: { articleId: number; title: string; summary: string | null }[] = []

  for (const candidateArticle of selectCandidateArticles(source, entries, now)) {
    const storedArticle = findStoredArticleTextByUrl(database, candidateArticle.url)
    if (!storedArticle) {
      newArticles.push(candidateArticle)
    } else if (
      storedArticle.sourceId === source.id &&
      (storedArticle.title !== candidateArticle.title || storedArticle.summary !== candidateArticle.summary)
    ) {
      articlesToRefresh.push({
        articleId: storedArticle.id,
        title: candidateArticle.title,
        summary: candidateArticle.summary
      })
    }
  }

  const articlesToInsert = await keepArticlesWithFrenchPage(newArticles, fetchPage)
  let newArticleCount = 0

  database.transaction(() => {
    for (const articleToRefresh of articlesToRefresh) {
      updateArticleText(database, articleToRefresh.articleId, articleToRefresh.title, articleToRefresh.summary)
      deleteArticleEmbedding(database, articleToRefresh.articleId)
    }
    for (const articleToInsert of articlesToInsert) {
      if (insertArticleIfNew(database, articleToInsert)) {
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

  async function collectSource(source: Source): Promise<void> {
    try {
      const feed = await fetchFeedWithTimeout(source.feedUrl, fetchFeed)
      const collectionDate = now()
      const sourceNewArticleCount = await storeEntries(database, source, feed.entries ?? [], collectionDate, options.fetchPage)
      result.newArticleCount += sourceNewArticleCount
      recordFetchSuccess(database, source.id, collectionDate.toISOString())
      result.succeededSourceCount += 1
    } catch (error) {
      recordFetchFailure(database, source.id, now().toISOString(), describeError(error))
      result.failedSourceCount += 1
    }
    completedSourceCount += 1
    options.onSourceProcessed?.(completedSourceCount, sources.length)
  }

  await mapWithBoundedConcurrency(sources, FEED_COLLECTION_CONCURRENCY, collectSource)

  return result
}
