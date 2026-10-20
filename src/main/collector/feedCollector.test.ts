import { describe, expect, it } from 'vitest'
import { addTestSource, buildEntry, createFeedFetcher, createTestDatabase, daysBefore, FIXED_NOW } from '../testing/testHelpers'
import { listSources } from '../repositories/sourceRepository'
import { collectFeeds } from './feedCollector'

function readArticles(database: ReturnType<typeof createTestDatabase>) {
  return database
    .prepare('SELECT url, title, summary, source_name, published_at FROM articles ORDER BY url')
    .all() as { url: string; title: string; summary: string | null; source_name: string; published_at: string }[]
}

describe('collectFeeds', () => {
  it('ne garde que les entrées datées de 14 jours ou moins et ignore celles sans date valide', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    const fetchFeed = createFeedFetcher({
      'https://blog-un.example.com/feed.xml': {
        entries: [
          buildEntry('recent', daysBefore(FIXED_NOW, 2)),
          buildEntry('limite', daysBefore(FIXED_NOW, 14)),
          buildEntry('trop-ancien', daysBefore(FIXED_NOW, 14.01)),
          buildEntry('sans-date', undefined),
          buildEntry('date-invalide', 'pas une date')
        ]
      }
    })

    const result = await collectFeeds(database, { fetchFeed, now: () => FIXED_NOW })

    expect(readArticles(database).map((article) => article.url)).toEqual([
      'https://blog.example.com/limite',
      'https://blog.example.com/recent'
    ])
    expect(result).toEqual({ succeededSourceCount: 1, failedSourceCount: 0, newArticleCount: 2 })
  })

  it('n enregistre que les entrées rédigées en français', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    const publishedAt = daysBefore(FIXED_NOW, 1)
    const fetchFeed = createFeedFetcher({
      'https://blog-un.example.com/feed.xml': {
        entries: [
          buildEntry('francais', publishedAt, {
            title: 'Les nouveautés de PHP 8.5 pour les développeurs',
            description: 'Un tour des fonctionnalités qui arrivent dans cette version.'
          }),
          buildEntry('anglais', publishedAt, {
            title: 'What is new in PHP 8.5 for your team',
            description: 'A tour of the features that are coming in this release.'
          }),
          buildEntry('espagnol', publishedAt, {
            title: 'Qwen3-4B deslop corta las muletillas de IA de 121 a 12,5 por 1000 palabras',
            description: 'Un modelo pequeño para limpiar los textos generados por la IA.'
          })
        ]
      }
    })

    const result = await collectFeeds(database, { fetchFeed, now: () => FIXED_NOW })

    expect(readArticles(database).map((article) => article.url)).toEqual(['https://blog.example.com/francais'])
    expect(result.newArticleCount).toBe(1)
  })

  it('ramène une date future à maintenant', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    const fetchFeed = createFeedFetcher({
      'https://blog-un.example.com/feed.xml': { entries: [buildEntry('futur', '2026-12-25T00:00:00.000Z')] }
    })

    await collectFeeds(database, { fetchFeed, now: () => FIXED_NOW })

    expect(readArticles(database)[0].published_at).toBe(FIXED_NOW.toISOString())
  })

  it('dédoublonne sur l URL normalisée, y compris entre deux collectes', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    addTestSource(database, 'Blog Deux')
    const publishedAt = daysBefore(FIXED_NOW, 1)
    const fetchFeed = createFeedFetcher({
      'https://blog-un.example.com/feed.xml': {
        entries: [
          buildEntry('a', publishedAt, { link: 'https://Blog.example.com/a/?utm_source=rss#top' }),
          buildEntry('a-bis', publishedAt, { link: 'https://blog.example.com/a' })
        ]
      },
      'https://blog-deux.example.com/feed.xml': {
        entries: [buildEntry('a-ter', publishedAt, { link: 'https://blog.example.com/a?ref=home' })]
      }
    })

    const firstResult = await collectFeeds(database, { fetchFeed, now: () => FIXED_NOW })
    const secondResult = await collectFeeds(database, { fetchFeed, now: () => FIXED_NOW })

    expect(readArticles(database)).toHaveLength(1)
    expect(firstResult.newArticleCount).toBe(1)
    expect(secondResult.newArticleCount).toBe(0)
  })

  it('copie le nom de la source et nettoie le résumé', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    const fetchFeed = createFeedFetcher({
      'https://blog-un.example.com/feed.xml': {
        entries: [buildEntry('a', daysBefore(FIXED_NOW, 1), { description: '<p>Bonjour   <b>monde</b></p>' })]
      }
    })

    await collectFeeds(database, { fetchFeed, now: () => FIXED_NOW })

    expect(readArticles(database)[0]).toMatchObject({ source_name: 'Blog Un', summary: 'Bonjour monde' })
  })

  it('enregistre l erreur d une source en échec sans bloquer les autres', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    addTestSource(database, 'Blog Casse')
    addTestSource(database, 'Blog Trois')
    const fetchFeed = createFeedFetcher({
      'https://blog-un.example.com/feed.xml': { entries: [buildEntry('un', daysBefore(FIXED_NOW, 1))] },
      'https://blog-casse.example.com/feed.xml': new Error('Réponse HTTP 500'),
      'https://blog-trois.example.com/feed.xml': { entries: [buildEntry('trois', daysBefore(FIXED_NOW, 1))] }
    })
    const progressCounts: number[] = []

    const result = await collectFeeds(database, {
      fetchFeed,
      now: () => FIXED_NOW,
      onSourceProcessed: (completedSourceCount) => progressCounts.push(completedSourceCount)
    })

    const sourcesByName = Object.fromEntries(listSources(database).map((source) => [source.name, source]))
    expect(sourcesByName['Blog Casse'].lastError).toBe('Réponse HTTP 500')
    expect(sourcesByName['Blog Un'].lastError).toBeNull()
    expect(sourcesByName['Blog Un'].lastFetchedAt).toBe(FIXED_NOW.toISOString())
    expect(readArticles(database)).toHaveLength(2)
    expect(result).toEqual({ succeededSourceCount: 2, failedSourceCount: 1, newArticleCount: 2 })
    expect(progressCounts).toEqual([1, 2, 3])
  })

  it('efface last_error après une collecte réussie', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    await collectFeeds(database, {
      fetchFeed: createFeedFetcher({ 'https://blog-un.example.com/feed.xml': new Error('panne') }),
      now: () => FIXED_NOW
    })
    await collectFeeds(database, {
      fetchFeed: createFeedFetcher({ 'https://blog-un.example.com/feed.xml': { entries: [] } }),
      now: () => FIXED_NOW
    })

    expect(listSources(database)[0].lastError).toBeNull()
  })

  it('ignore les sources désactivées et limite la concurrence à 6', async () => {
    const database = createTestDatabase()
    for (let sourceNumber = 1; sourceNumber <= 10; sourceNumber += 1) {
      addTestSource(database, `Blog ${sourceNumber}`)
    }
    database.prepare("UPDATE sources SET is_enabled = 0 WHERE name = 'Blog 10'").run()
    let runningFetchCount = 0
    let maxRunningFetchCount = 0
    const requestedFeedUrls: string[] = []

    await collectFeeds(database, {
      now: () => FIXED_NOW,
      fetchFeed: async (feedUrl) => {
        requestedFeedUrls.push(feedUrl)
        runningFetchCount += 1
        maxRunningFetchCount = Math.max(maxRunningFetchCount, runningFetchCount)
        await new Promise((resolve) => setTimeout(resolve, 5))
        runningFetchCount -= 1
        return { entries: [] }
      }
    })

    expect(requestedFeedUrls).toHaveLength(9)
    expect(maxRunningFetchCount).toBe(6)
  })
})
