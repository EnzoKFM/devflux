import { describe, expect, it } from 'vitest'
import { createTestDatabase, FIXED_NOW } from '../testing/testHelpers'
import { listSources } from '../repositories/sourceRepository'
import { seedSourcesOnce, type SeedSource } from './seedSources'

const SEED_SOURCES: SeedSource[] = [
  { name: 'Blog Un', feedUrl: 'https://un.example.com/feed', siteUrl: 'https://un.example.com', category: 'web' },
  { name: 'Blog Deux', feedUrl: 'https://deux.example.com/feed', siteUrl: 'https://deux.example.com', category: 'software' }
]

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
})
