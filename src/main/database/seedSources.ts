import type Database from 'better-sqlite3'
import type { SourceCategory } from '@shared/contract'
import { getSetting, setSetting } from '../repositories/settingsRepository'

export interface SeedSource {
  name: string
  feedUrl: string
  siteUrl: string
  category: SourceCategory
}

export const SOURCES_SEEDED_SETTING_KEY = 'sources_seeded'

export function seedSourcesOnce(database: Database.Database, seedSources: SeedSource[], createdAt: string): boolean {
  if (getSetting(database, SOURCES_SEEDED_SETTING_KEY) !== null) {
    return false
  }
  const insertStatement = database.prepare(
    'INSERT OR IGNORE INTO sources (name, feed_url, site_url, category, created_at) VALUES (?, ?, ?, ?, ?)'
  )
  database.transaction(() => {
    for (const seedSource of seedSources) {
      insertStatement.run(seedSource.name, seedSource.feedUrl, seedSource.siteUrl, seedSource.category, createdAt)
    }
    setSetting(database, SOURCES_SEEDED_SETTING_KEY, createdAt)
  })()
  return true
}
