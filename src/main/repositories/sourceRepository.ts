import type Database from 'better-sqlite3'
import { SOURCE_HEALTH_WINDOW_IN_DAYS, type Source, type SourceCategory } from '@shared/contract'
import { MILLISECONDS_PER_DAY } from '@shared/time'

interface SourceRow {
  id: number
  name: string
  feed_url: string
  site_url: string | null
  category: SourceCategory
  is_enabled: number
  last_fetched_at: string | null
  last_succeeded_at: string | null
  last_error: string | null
  created_at: string
  recent_article_count: number
}

export interface NewSource {
  name: string
  feedUrl: string
  siteUrl: string | null
  category: SourceCategory
}

const SOURCE_SELECT = `
  SELECT
    sources.id, sources.name, sources.feed_url, sources.site_url, sources.category, sources.is_enabled,
    sources.last_fetched_at, sources.last_succeeded_at, sources.last_error, sources.created_at,
    (SELECT COUNT(*) FROM articles WHERE articles.source_id = sources.id AND articles.fetched_at >= @recentSince)
      AS recent_article_count
  FROM sources
`

function computeRecentSince(now: Date): string {
  return new Date(now.getTime() - SOURCE_HEALTH_WINDOW_IN_DAYS * MILLISECONDS_PER_DAY).toISOString()
}

function mapSourceRow(sourceRow: SourceRow): Source {
  return {
    id: sourceRow.id,
    name: sourceRow.name,
    feedUrl: sourceRow.feed_url,
    siteUrl: sourceRow.site_url,
    category: sourceRow.category,
    isEnabled: sourceRow.is_enabled === 1,
    lastFetchedAt: sourceRow.last_fetched_at,
    lastSucceededAt: sourceRow.last_succeeded_at,
    lastError: sourceRow.last_error,
    createdAt: sourceRow.created_at,
    recentArticleCount: sourceRow.recent_article_count
  }
}

export function listSources(database: Database.Database, now: Date = new Date()): Source[] {
  const sourceRows = database
    .prepare(`${SOURCE_SELECT} ORDER BY sources.category, sources.name COLLATE NOCASE`)
    .all({ recentSince: computeRecentSince(now) }) as SourceRow[]
  return sourceRows.map(mapSourceRow)
}

export function listEnabledSources(database: Database.Database, now: Date = new Date()): Source[] {
  const sourceRows = database
    .prepare(`${SOURCE_SELECT} WHERE sources.is_enabled = 1 ORDER BY sources.id`)
    .all({ recentSince: computeRecentSince(now) }) as SourceRow[]
  return sourceRows.map(mapSourceRow)
}

export function findSourceById(database: Database.Database, sourceId: number, now: Date = new Date()): Source | null {
  const sourceRow = database
    .prepare(`${SOURCE_SELECT} WHERE sources.id = @sourceId`)
    .get({ sourceId, recentSince: computeRecentSince(now) }) as SourceRow | undefined
  return sourceRow ? mapSourceRow(sourceRow) : null
}

export function isFeedUrlRegistered(database: Database.Database, feedUrl: string): boolean {
  return database.prepare('SELECT 1 FROM sources WHERE feed_url = ?').get(feedUrl) !== undefined
}

export function insertSource(database: Database.Database, newSource: NewSource, createdAt: string): Source {
  const insertResult = database
    .prepare('INSERT INTO sources (name, feed_url, site_url, category, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(newSource.name, newSource.feedUrl, newSource.siteUrl, newSource.category, createdAt)
  const insertedSource = findSourceById(database, Number(insertResult.lastInsertRowid))
  if (!insertedSource) {
    throw new Error('Source introuvable après insertion')
  }
  return insertedSource
}

export function setSourceEnabled(database: Database.Database, sourceId: number, isEnabled: boolean): void {
  database.prepare('UPDATE sources SET is_enabled = ? WHERE id = ?').run(isEnabled ? 1 : 0, sourceId)
}

export function deleteSource(database: Database.Database, sourceId: number): void {
  database.prepare('DELETE FROM sources WHERE id = ?').run(sourceId)
}

export function recordFetchSuccess(database: Database.Database, sourceId: number, fetchedAt: string): void {
  database
    .prepare('UPDATE sources SET last_fetched_at = ?, last_succeeded_at = ?, last_error = NULL WHERE id = ?')
    .run(fetchedAt, fetchedAt, sourceId)
}

export function recordFetchFailure(
  database: Database.Database,
  sourceId: number,
  fetchedAt: string,
  errorMessage: string
): void {
  database
    .prepare('UPDATE sources SET last_fetched_at = ?, last_error = ? WHERE id = ?')
    .run(fetchedAt, errorMessage, sourceId)
}
