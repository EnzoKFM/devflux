import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase, FIXED_NOW } from '../testing/testHelpers'
import { setSetting } from '../repositories/settingsRepository'
import { insertSource, listSources } from '../repositories/sourceRepository'
import { applyMigrations, MIGRATIONS } from './migrations'
import { seedSourcesOnce, SOURCES_SEEDED_SETTING_KEY, type SeedSource } from './seedSources'
import seedSourcesJson from './seedSources.json'

const SEED_SOURCES: SeedSource[] = [
  { name: 'Blog Un', feedUrl: 'https://un.example.com/feed', siteUrl: 'https://un.example.com', category: 'web' },
  { name: 'Blog Deux', feedUrl: 'https://deux.example.com/feed', siteUrl: 'https://deux.example.com', category: 'software' }
]

const RETAINED_FRENCH_FEED_URLS = [
  'https://grafikart.fr/feed.rss',
  'https://www.alsacreations.com/rss/actualites.xml',
  'https://www.sfeir.dev/rss/',
  'https://blog.octo.com/feed/',
  'https://www.journalduhacker.net/rss'
]
const DELETED_FEED_URL = 'https://www.journalduhacker.net/rss'
const PRE_FRENCH_SOURCES_SEEDED_SETTING_KEY = 'sources_seeded'

describe('seedSourcesOnce', () => {
  it('insère la liste de départ au premier appel uniquement', () => {
    const database = createTestDatabase()

    expect(seedSourcesOnce(database, SEED_SOURCES, FIXED_NOW.toISOString())).toBe(true)
    database.prepare('DELETE FROM sources').run()
    expect(seedSourcesOnce(database, SEED_SOURCES, FIXED_NOW.toISOString())).toBe(false)

    expect(listSources(database)).toHaveLength(0)
  })

  it('renseigne les sources actives avec leur catégorie', () => {
    const database = createTestDatabase()

    seedSourcesOnce(database, SEED_SOURCES, FIXED_NOW.toISOString())

    expect(listSources(database).map((source) => [source.name, source.category, source.isEnabled])).toEqual([
      ['Blog Deux', 'software', true],
      ['Blog Un', 'web', true]
    ])
  })

  it('complète une base déjà initialisée sans recréer une source de départ supprimée', () => {
    const database = new Database(':memory:')
    database.pragma('foreign_keys = ON')
    database.exec(MIGRATIONS[0])
    database.exec(MIGRATIONS[1])
    database.pragma('user_version = 2')
    const retainedSeedSources = (seedSourcesJson as SeedSource[]).filter((seedSource) =>
      RETAINED_FRENCH_FEED_URLS.includes(seedSource.feedUrl)
    )
    for (const retainedSeedSource of retainedSeedSources) {
      insertSource(database, retainedSeedSource, FIXED_NOW.toISOString())
    }
    setSetting(database, PRE_FRENCH_SOURCES_SEEDED_SETTING_KEY, FIXED_NOW.toISOString())
    database.prepare('DELETE FROM sources WHERE feed_url = ?').run(DELETED_FEED_URL)

    applyMigrations(database)
    seedSourcesOnce(database, seedSourcesJson as SeedSource[], FIXED_NOW.toISOString())

    const feedUrls = listSources(database).map((source) => source.feedUrl)
    expect(feedUrls).not.toContain(DELETED_FEED_URL)
    expect(feedUrls).toHaveLength(seedSourcesJson.length - 1)
  })

  it('n ajoute par migration que des sources de la liste de départ', () => {
    const database = new Database(':memory:')
    database.pragma('foreign_keys = ON')
    database.exec(MIGRATIONS[0])
    database.exec(MIGRATIONS[1])
    database.pragma('user_version = 2')
    setSetting(database, SOURCES_SEEDED_SETTING_KEY, FIXED_NOW.toISOString())

    applyMigrations(database)

    const seedSourceKeys = (seedSourcesJson as SeedSource[]).map((seedSource) =>
      [seedSource.name, seedSource.feedUrl, seedSource.siteUrl, seedSource.category].join('|')
    )
    for (const source of listSources(database)) {
      expect(seedSourceKeys).toContain([source.name, source.feedUrl, source.siteUrl, source.category].join('|'))
    }
  })

  it('ne livre aucune source que les migrations suppriment', () => {
    const database = new Database(':memory:')
    database.pragma('foreign_keys = ON')
    database.exec(MIGRATIONS[0])
    database.exec(MIGRATIONS[1])
    database.pragma('user_version = 2')
    seedSourcesOnce(database, seedSourcesJson as SeedSource[], FIXED_NOW.toISOString())

    applyMigrations(database)

    expect(listSources(database)).toHaveLength(seedSourcesJson.length)
  })
})
