import Database from 'better-sqlite3'
import type { FeedData, FeedEntry } from '@extractus/feed-extractor'
import type { FeedbackReason, SourceCategory } from '@shared/contract'
import { applyMigrations } from '../database/migrations'
import type { FeedFetcher } from '../collector/feedFetcher'
import type { EmbedOptions, EmbeddingProvider } from '../recommendation/embeddingProvider'
import { insertSource } from '../repositories/sourceRepository'

export const FIXED_NOW = new Date('2026-10-19T09:30:00.000Z')

export function createTestDatabase(): Database.Database {
  const database = new Database(':memory:')
  database.pragma('foreign_keys = ON')
  applyMigrations(database)
  return database
}

export function addTestSource(
  database: Database.Database,
  name: string,
  category: SourceCategory = 'web'
): number {
  return insertSource(
    database,
    { name, feedUrl: `https://${name.toLowerCase().replace(/\s+/g, '-')}.example.com/feed.xml`, siteUrl: null, category },
    FIXED_NOW.toISOString()
  ).id
}

export function daysBefore(date: Date, dayCount: number): string {
  return new Date(date.getTime() - dayCount * 24 * 60 * 60 * 1000).toISOString()
}

export function buildEntry(slug: string, published: string | undefined, overrides: Partial<FeedEntry> = {}): FeedEntry {
  return {
    id: slug,
    link: `https://blog.example.com/${slug}`,
    title: `Article ${slug}`,
    description: `Résumé ${slug}`,
    published,
    ...overrides
  }
}

export function createFeedFetcher(feedsByUrl: Record<string, FeedData | Error>): FeedFetcher {
  return async (feedUrl) => {
    const feedOrError = feedsByUrl[feedUrl]
    if (feedOrError === undefined) {
      throw new Error(`Flux inconnu ${feedUrl}`)
    }
    if (feedOrError instanceof Error) {
      throw feedOrError
    }
    return feedOrError
  }
}

export function insertTestArticle(
  database: Database.Database,
  options: {
    sourceId: number
    slug: string
    title?: string
    publishedAt: string
    digestDate?: string | null
    isFavorite?: boolean
    isReadLater?: boolean
    rating?: 'like' | 'dislike'
    reason?: FeedbackReason
  }
): number {
  const insertResult = database
    .prepare(
      `INSERT INTO articles (source_id, source_name, url, title, summary, published_at, fetched_at, digest_date, is_favorite, is_read_later)
       VALUES (?, 'Source de test', ?, ?, NULL, ?, ?, ?, ?, ?)`
    )
    .run(
      options.sourceId,
      `https://blog.example.com/${options.slug}`,
      options.title ?? `Article ${options.slug}`,
      options.publishedAt,
      FIXED_NOW.toISOString(),
      options.digestDate ?? null,
      options.isFavorite ? 1 : 0,
      options.isReadLater ? 1 : 0
    )
  const articleId = Number(insertResult.lastInsertRowid)
  if (options.rating) {
    database
      .prepare('INSERT INTO feedback (article_id, rating, reason, created_at) VALUES (?, ?, ?, ?)')
      .run(articleId, options.rating, options.reason ?? null, FIXED_NOW.toISOString())
  }
  return articleId
}

const VARIANT_DIMENSION_COUNT = 64

export interface FakeEmbeddingProvider extends EmbeddingProvider {
  embeddedTexts: string[]
  embedCallCount: number
}

export function createKeywordEmbeddingProvider(
  axisKeywords: string[],
  options: { isModelDownloadRequired?: boolean; failure?: Error; modelId?: string } = {}
): FakeEmbeddingProvider {
  const embedText = (text: string): Float32Array => {
    const normalizedText = text.toLowerCase()
    const vector = new Float32Array(axisKeywords.length + VARIANT_DIMENSION_COUNT)
    axisKeywords.forEach((axisKeyword, axisIndex) => {
      vector[axisIndex] = normalizedText.includes(axisKeyword) ? 1 : 0
    })
    const trailingNumber = /(\d+)\s*$/.exec(text)
    if (trailingNumber) {
      vector[axisKeywords.length + (Number(trailingNumber[1]) % VARIANT_DIMENSION_COUNT)] = 1
    }
    return vector
  }

  const embeddingProvider: FakeEmbeddingProvider = {
    modelId: options.modelId ?? 'modele-factice',
    embeddedTexts: [],
    embedCallCount: 0,
    isModelDownloadRequired: () => options.isModelDownloadRequired ?? false,
    async embed(texts: string[], embedOptions?: EmbedOptions): Promise<Float32Array[]> {
      embeddingProvider.embedCallCount += 1
      if (options.isModelDownloadRequired) {
        embedOptions?.onModelReady?.()
      }
      if (options.failure) {
        throw options.failure
      }
      embeddingProvider.embeddedTexts.push(...texts)
      return texts.map(embedText)
    }
  }
  return embeddingProvider
}
