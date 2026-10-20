import { describe, expect, it } from 'vitest'
import { createTestDatabase, FIXED_NOW } from '../testing/testHelpers'
import { listSources } from '../repositories/sourceRepository'
import { addSource, importSources, removeSource, setSourceEnabled } from './sourceService'

const validFetcher = async () => ({ title: ' Mon Blog ', link: 'https://blog.example.com', entries: [] })

describe('addSource', () => {
  it('valide le flux et utilise son titre et son lien', async () => {
    const database = createTestDatabase()

    const source = await addSource(database, 'https://blog.example.com/feed.xml', 'web', {
      fetchFeed: validFetcher,
      now: () => FIXED_NOW
    })

    expect(source).toMatchObject({
      name: 'Mon Blog',
      feedUrl: 'https://blog.example.com/feed.xml',
      siteUrl: 'https://blog.example.com/',
      category: 'web',
      isEnabled: true
    })
  })

  it('refuse une URL invalide', async () => {
    const database = createTestDatabase()

    await expect(addSource(database, 'ftp://example.com/feed', 'web', { fetchFeed: validFetcher })).rejects.toThrow(
      'invalide'
    )
  })

  it('refuse un flux illisible', async () => {
    const database = createTestDatabase()
    const failingFetcher = async () => {
      throw new Error('Unrecognized feed format')
    }

    await expect(
      addSource(database, 'https://blog.example.com/page', 'web', { fetchFeed: failingFetcher })
    ).rejects.toThrow('Impossible de lire ce flux (Unrecognized feed format)')
    expect(listSources(database)).toHaveLength(0)
  })

  it('refuse un doublon', async () => {
    const database = createTestDatabase()
    await addSource(database, 'https://blog.example.com/feed.xml', 'web', { fetchFeed: validFetcher })

    await expect(
      addSource(database, 'https://blog.example.com/feed.xml', 'general', { fetchFeed: validFetcher })
    ).rejects.toThrow('déjà')
  })
})

describe('activation et suppression', () => {
  it('bascule et supprime une source', async () => {
    const database = createTestDatabase()
    const source = await addSource(database, 'https://blog.example.com/feed.xml', 'web', { fetchFeed: validFetcher })

    setSourceEnabled(database, source.id, false)
    expect(listSources(database)[0].isEnabled).toBe(false)

    removeSource(database, source.id)
    expect(listSources(database)).toHaveLength(0)
  })
})

describe('importSources', () => {
  it('ajoute les nouvelles sources sans appel réseau et compte celles déjà présentes ou en double', () => {
    const database = createTestDatabase()
    importSources(
      database,
      [{ name: 'Existant', feedUrl: 'https://existant.example.com/feed', siteUrl: null, category: 'web' }],
      FIXED_NOW.toISOString()
    )

    const importReport = importSources(
      database,
      [
        { name: 'Existant', feedUrl: 'https://existant.example.com/feed', siteUrl: null, category: 'web' },
        { name: 'Nouveau', feedUrl: 'https://nouveau.example.com/feed', siteUrl: 'https://nouveau.example.com/', category: 'software' },
        { name: 'Nouveau bis', feedUrl: 'https://nouveau.example.com/feed', siteUrl: null, category: 'web' }
      ],
      FIXED_NOW.toISOString()
    )

    expect(importReport).toEqual({ importedCount: 1, skippedCount: 2 })
    expect(listSources(database).map((source) => [source.name, source.category, source.isEnabled])).toEqual([
      ['Nouveau', 'software', true],
      ['Existant', 'web', true]
    ])
  })
})
