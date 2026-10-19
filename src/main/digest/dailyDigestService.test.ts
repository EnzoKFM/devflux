import { describe, expect, it } from 'vitest'
import { DAILY_DIGEST_SIZE, type PreparationProgress } from '@shared/contract'
import {
  addTestSource,
  buildEntry,
  createFeedFetcher,
  createTestDatabase,
  daysBefore,
  FIXED_NOW,
  insertTestArticle
} from '../testing/testHelpers'
import { listFavoriteArticles, listReadLaterArticles } from '../repositories/articleRepository'
import {
  formatLocalDate,
  MAX_DIGEST_ARTICLES_PER_SOURCE,
  prepareDailyDigest,
  purgeExpiredArticles
} from './dailyDigestService'

describe('formatLocalDate', () => {
  it('formate la date en heure locale', () => {
    expect(formatLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(formatLocalDate(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31')
  })
})

describe('prepareDailyDigest', () => {
  it('ne construit le fil qu une seule fois par jour', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    let fetchCount = 0
    const fetchFeed = async () => {
      fetchCount += 1
      return { entries: [buildEntry('a', daysBefore(FIXED_NOW, 1)), buildEntry('b', daysBefore(FIXED_NOW, 2))] }
    }

    const firstDigest = await prepareDailyDigest(database, { fetchFeed, now: () => FIXED_NOW })
    const secondDigest = await prepareDailyDigest(database, { fetchFeed, now: () => FIXED_NOW })

    expect(fetchCount).toBe(1)
    expect(firstDigest.collectionReport).toMatchObject({ succeededSourceCount: 1, failedSourceCount: 0, newArticleCount: 2 })
    expect(secondDigest.collectionReport).toBeNull()
    expect(secondDigest.articles.map((article) => article.id)).toEqual(firstDigest.articles.map((article) => article.id))
    expect(firstDigest.digestDate).toBe(formatLocalDate(FIXED_NOW))
  })

  it('reconstruit un nouveau fil le jour suivant sans reprendre les articles déjà affichés', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    const fetchFeed = async () => ({
      entries: [buildEntry('a', daysBefore(FIXED_NOW, 1)), buildEntry('b', daysBefore(FIXED_NOW, 2))]
    })
    const nextDay = new Date(FIXED_NOW.getTime() + 24 * 60 * 60 * 1000)

    const firstDigest = await prepareDailyDigest(database, { fetchFeed, now: () => FIXED_NOW })
    const secondDigest = await prepareDailyDigest(database, { fetchFeed, now: () => nextDay })

    expect(firstDigest.articles).toHaveLength(2)
    expect(secondDigest.articles).toHaveLength(0)
    expect(secondDigest.collectionReport).not.toBeNull()
  })

  it(`limite le fil à ${DAILY_DIGEST_SIZE} articles, du plus récent au plus ancien`, async () => {
    const database = createTestDatabase()
    for (let sourceNumber = 1; sourceNumber <= 10; sourceNumber += 1) {
      addTestSource(database, `Blog ${sourceNumber}`)
    }
    const sourceIds = (database.prepare('SELECT id FROM sources ORDER BY id').all() as { id: number }[]).map(
      (sourceRow) => sourceRow.id
    )
    sourceIds.forEach((sourceId, sourceIndex) => {
      for (let articleIndex = 0; articleIndex < 3; articleIndex += 1) {
        insertTestArticle(database, {
          sourceId,
          slug: `s${sourceIndex}-a${articleIndex}`,
          publishedAt: daysBefore(FIXED_NOW, 1 + sourceIndex * 0.1 + articleIndex * 0.01)
        })
      }
    })

    const digest = await prepareDailyDigest(database, { fetchFeed: async () => ({ entries: [] }), now: () => FIXED_NOW })

    expect(digest.articles).toHaveLength(DAILY_DIGEST_SIZE)
    const publicationDates = digest.articles.map((article) => article.publishedAt)
    expect(publicationDates).toEqual([...publicationDates].sort().reverse())
  })

  it(`plafonne à ${MAX_DIGEST_ARTICLES_PER_SOURCE} articles par source`, async () => {
    const database = createTestDatabase()
    const prolificSourceId = addTestSource(database, 'Blog Prolifique')
    const quietSourceId = addTestSource(database, 'Blog Calme')
    for (let articleIndex = 0; articleIndex < 9; articleIndex += 1) {
      insertTestArticle(database, {
        sourceId: prolificSourceId,
        slug: `prolifique-${articleIndex}`,
        publishedAt: daysBefore(FIXED_NOW, 0.1 + articleIndex * 0.01)
      })
    }
    insertTestArticle(database, { sourceId: quietSourceId, slug: 'calme', publishedAt: daysBefore(FIXED_NOW, 5) })

    const digest = await prepareDailyDigest(database, { fetchFeed: async () => ({ entries: [] }), now: () => FIXED_NOW })

    const articleCountBySourceName = new Map<string, number>()
    for (const article of digest.articles) {
      articleCountBySourceName.set(article.sourceName, (articleCountBySourceName.get(article.sourceName) ?? 0) + 1)
    }
    expect(digest.articles).toHaveLength(MAX_DIGEST_ARTICLES_PER_SOURCE + 1)
    expect(digest.articles.map((article) => article.url)).toContain('https://blog.example.com/calme')
  })

  it('donne une place à chaque source avant d accorder un second article aux sources prolifiques', async () => {
    const database = createTestDatabase()
    const prolificSourceIds = Array.from({ length: 6 }, (_, sourceIndex) =>
      addTestSource(database, `Agrégateur ${sourceIndex}`)
    )
    const quietSourceIds = Array.from({ length: 10 }, (_, sourceIndex) => addTestSource(database, `Blog ${sourceIndex}`))
    prolificSourceIds.forEach((prolificSourceId, sourceIndex) => {
      for (let articleIndex = 0; articleIndex < 10; articleIndex += 1) {
        insertTestArticle(database, {
          sourceId: prolificSourceId,
          slug: `agregateur-${sourceIndex}-${articleIndex}`,
          publishedAt: daysBefore(FIXED_NOW, 0.1 + articleIndex * 0.01)
        })
      }
    })
    quietSourceIds.forEach((quietSourceId, sourceIndex) => {
      insertTestArticle(database, {
        sourceId: quietSourceId,
        slug: `blog-${sourceIndex}`,
        publishedAt: daysBefore(FIXED_NOW, 3 + sourceIndex * 0.1)
      })
    })

    const digest = await prepareDailyDigest(database, { fetchFeed: async () => ({ entries: [] }), now: () => FIXED_NOW })

    const digestArticleUrls = digest.articles.map((article) => article.url)
    expect(digest.articles).toHaveLength(DAILY_DIGEST_SIZE)
    quietSourceIds.forEach((_, sourceIndex) => {
      expect(digestArticleUrls).toContain(`https://blog.example.com/blog-${sourceIndex}`)
    })
  })

  it('exclut les articles déjà affichés, notés ou trop anciens', async () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    const publishedAt = daysBefore(FIXED_NOW, 1)
    insertTestArticle(database, { sourceId, slug: 'neuf', publishedAt })
    insertTestArticle(database, { sourceId, slug: 'deja-affiche', publishedAt, digestDate: '2026-10-18' })
    insertTestArticle(database, { sourceId, slug: 'note', publishedAt, rating: 'like' })
    insertTestArticle(database, { sourceId, slug: 'ancien', publishedAt: daysBefore(FIXED_NOW, 20), isFavorite: true })

    const digest = await prepareDailyDigest(database, { fetchFeed: async () => ({ entries: [] }), now: () => FIXED_NOW })

    expect(digest.articles.map((article) => article.url)).toEqual(['https://blog.example.com/neuf'])
  })

  it('publie les étapes de progression dans l ordre', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    const progressSteps: PreparationProgress[] = []

    await prepareDailyDigest(database, {
      fetchFeed: async () => ({ entries: [] }),
      now: () => FIXED_NOW,
      onProgress: (progress) => progressSteps.push(progress)
    })

    expect(progressSteps.map((progress) => progress.step)).toEqual([
      'purging',
      'collecting',
      'collecting',
      'building-digest',
      'done'
    ])
    expect(progressSteps.at(-1)).toEqual({ step: 'done', completedSourceCount: 1, totalSourceCount: 1 })
  })
})

describe('purgeExpiredArticles', () => {
  it('supprime les articles de plus de 14 jours sauf favoris, plus tard et notés', () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    const expiredAt = daysBefore(FIXED_NOW, 15)
    insertTestArticle(database, { sourceId, slug: 'supprime', publishedAt: expiredAt })
    insertTestArticle(database, { sourceId, slug: 'favori', publishedAt: expiredAt, isFavorite: true })
    insertTestArticle(database, { sourceId, slug: 'plus-tard', publishedAt: expiredAt, isReadLater: true })
    insertTestArticle(database, { sourceId, slug: 'note', publishedAt: expiredAt, rating: 'dislike' })
    insertTestArticle(database, { sourceId, slug: 'recent', publishedAt: daysBefore(FIXED_NOW, 3) })

    const purgedCount = purgeExpiredArticles(database, FIXED_NOW)

    const remainingUrls = (database.prepare('SELECT url FROM articles ORDER BY url').all() as { url: string }[]).map(
      (articleRow) => articleRow.url
    )
    expect(purgedCount).toBe(1)
    expect(remainingUrls).toEqual([
      'https://blog.example.com/favori',
      'https://blog.example.com/note',
      'https://blog.example.com/plus-tard',
      'https://blog.example.com/recent'
    ])
  })
})

describe('listes plus tard et favoris', () => {
  it('sont triées du plus récent au plus ancien', () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    insertTestArticle(database, { sourceId, slug: 'ancien', publishedAt: daysBefore(FIXED_NOW, 9), isReadLater: true, isFavorite: true })
    insertTestArticle(database, { sourceId, slug: 'recent', publishedAt: daysBefore(FIXED_NOW, 1), isReadLater: true, isFavorite: true })
    insertTestArticle(database, { sourceId, slug: 'milieu', publishedAt: daysBefore(FIXED_NOW, 4), isReadLater: true, isFavorite: true })
    const expectedUrls = [
      'https://blog.example.com/recent',
      'https://blog.example.com/milieu',
      'https://blog.example.com/ancien'
    ]

    expect(listReadLaterArticles(database).map((article) => article.url)).toEqual(expectedUrls)
    expect(listFavoriteArticles(database).map((article) => article.url)).toEqual(expectedUrls)
  })
})

describe('intégration collecte et fil', () => {
  it('affecte la date du jour aux articles du fil et signale les sources en échec', async () => {
    const database = createTestDatabase()
    addTestSource(database, 'Blog Un')
    addTestSource(database, 'Blog Casse')
    const fetchFeed = createFeedFetcher({
      'https://blog-un.example.com/feed.xml': { entries: [buildEntry('a', daysBefore(FIXED_NOW, 1))] },
      'https://blog-casse.example.com/feed.xml': new Error('panne')
    })

    const digest = await prepareDailyDigest(database, { fetchFeed, now: () => FIXED_NOW })

    expect(digest.collectionReport).toEqual({
      succeededSourceCount: 1,
      failedSourceCount: 1,
      newArticleCount: 1,
      purgedArticleCount: 0
    })
    expect(digest.articles).toHaveLength(1)
  })
})
