import type Database from 'better-sqlite3'
import type { Source, SourceCategory } from '@shared/contract'

interface SourceRow {
  id: number
  name: string
  feed_url: string
  site_url: string | null
  category: SourceCategory
  is_enabled: number
  last_fetched_at: string | null
  last_error: string | null
}

export interface NewSource {
  name: string
  feedUrl: string
  siteUrl: string | null
  category: SourceCategory
}

const SOURCE_COLUMNS = 'id, name, feed_url, site_url, category, is_enabled, last_fetched_at, last_error'

function mapSourceRow(sourceRow: SourceRow): Source {
  return {
    id: sourceRow.id,
    name: sourceRow.name,
    feedUrl: sourceRow.feed_url,
    siteUrl: sourceRow.site_url,
    category: sourceRow.category,
    isEnabled: sourceRow.is_enabled === 1,
    lastFetchedAt: sourceRow.last_fetched_at,
    lastError: sourceRow.last_error
  }
}

export function listSources(database: Database.Database): Source[] {
  const sourceRows = database
    .prepare(`SELECT ${SOURCE_COLUMNS} FROM sources ORDER BY category, name COLLATE NOCASE`)
    .all() as SourceRow[]
  return sourceRows.map(mapSourceRow)
}

export function listEnabledSources(database: Database.Database): Source[] {
  const sourceRows = database
    .prepare(`SELECT ${SOURCE_COLUMNS} FROM sources WHERE is_enabled = 1 ORDER BY id`)
    .all() as SourceRow[]
  return sourceRows.map(mapSourceRow)
}

export function findSourceById(database: Database.Database, sourceId: number): Source | null {
  const sourceRow = database.prepare(`SELECT ${SOURCE_COLUMNS} FROM sources WHERE id = ?`).get(sourceId) as
    | SourceRow
    | undefined
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
  database.prepare('UPDATE sources SET last_fetched_at = ?, last_error = NULL WHERE id = ?').run(fetchedAt, sourceId)
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
