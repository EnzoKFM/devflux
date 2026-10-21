import { describe, expect, it } from 'vitest'
import { DAILY_DIGEST_SIZE, type PreparationProgress } from '@shared/contract'
import {
  addTestSource,
  buildEntry,
  createFeedFetcher,
  createKeywordEmbeddingProvider,
  createTestDatabase,
  daysBefore,
  FIXED_NOW,
  fetchFrenchPage,
  insertTestArticle
} from '../testing/testHelpers'
import { getUserProfile } from '../profile/profileService'
import { listFavoriteArticles, listReadLaterArticles } from '../repositories/articleRepository'
import { MAX_DIGEST_ARTICLES_PER_SOURCE } from '../recommendation/selection'
import { formatLocalDate, prepareDailyDigest, purgeExpiredArticles } from './dailyDigestService'

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

    const firstDigest = await prepareDailyDigest(database, { fetchFeed, fetchPage: fetchFrenchPage, now: () => FIXED_NOW })
    const secondDigest = await prepareDailyDigest(database, { fetchFeed, fetchPage: fetchFrenchPage, now: () => FIXED_NOW })

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

    const firstDigest = await prepareDailyDigest(database, { fetchFeed, fetchPage: fetchFrenchPage, now: () => FIXED_NOW })
    const secondDigest = await prepareDailyDigest(database, { fetchFeed, fetchPage: fetchFrenchPage, now: () => nextDay })

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

  it('écarte du fil les articles déjà collectés qui ne sont pas en français', async () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    const publishedAt = daysBefore(FIXED_NOW, 1)
    insertTestArticle(database, { sourceId, slug: 'francais', title: 'Les nouveautés de Python pour les développeurs', publishedAt })
    insertTestArticle(database, { sourceId, slug: 'anglais', title: 'What is new in the Python release for your team', publishedAt })
    insertTestArticle(database, { sourceId, slug: 'portugais', title: 'O agente mudou as próprias regras. Quem aprovou a nova versão?', publishedAt })

    const digest = await prepareDailyDigest(database, { fetchFeed: async () => ({ entries: [] }), now: () => FIXED_NOW })

    expect(digest.articles.map((article) => article.url)).toEqual(['https://blog.example.com/francais'])
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

    const digest = await prepareDailyDigest(database, { fetchFeed, fetchPage: fetchFrenchPage, now: () => FIXED_NOW })

    expect(digest.collectionReport).toEqual({
      succeededSourceCount: 1,
      failedSourceCount: 1,
      newArticleCount: 1,
      purgedArticleCount: 0
    })
    expect(digest.articles).toHaveLength(1)
  })
})

describe('recommandation locale dans le fil', () => {
  const emptyFeedFetcher = async () => ({ entries: [] })
  const RATED_ARTICLE_VARIANT_OFFSET = 40

  function listDistinctSteps(progressSteps: PreparationProgress[]): string[] {
    return progressSteps
      .map((progress) => progress.step)
      .filter((step, stepIndex, steps) => step !== steps[stepIndex - 1])
  }

  function seedTopicArticles(
    database: ReturnType<typeof createTestDatabase>,
    topicKeyword: string,
    articleCount: number,
    ageInDays: number
  ): void {
    for (let articleNumber = 1; articleNumber <= articleCount; articleNumber += 1) {
      const sourceId = addTestSource(database, `Blog ${topicKeyword} ${articleNumber}`)
      insertTestArticle(database, {
        sourceId,
        slug: `${topicKeyword}-${articleNumber}`,
        publishedAt: daysBefore(FIXED_NOW, ageInDays + articleNumber * 0.001)
      })
    }
  }

  function rateTopicArticles(
    database: ReturnType<typeof createTestDatabase>,
    topicKeyword: string,
    rating: 'like' | 'dislike',
    articleCount: number
  ): void {
    const sourceId = addTestSource(database, `Blog noté ${topicKeyword}`)
    for (let articleNumber = 1; articleNumber <= articleCount; articleNumber += 1) {
      insertTestArticle(database, {
        sourceId,
        slug: `note-${topicKeyword}-${RATED_ARTICLE_VARIANT_OFFSET + articleNumber}`,
        publishedAt: daysBefore(FIXED_NOW, 3),
        rating,
        reason: rating === 'dislike' ? 'off-topic' : undefined
      })
    }
  }

  it('n appelle jamais le fournisseur d embeddings en démarrage à froid', async () => {
    const database = createTestDatabase()
    seedTopicArticles(database, 'rust', 3, 1)
    const embeddingProvider = createKeywordEmbeddingProvider(['rust'])
    const progressSteps: PreparationProgress[] = []

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider,
      onProgress: (progress) => progressSteps.push(progress)
    })

    expect(embeddingProvider.embedCallCount).toBe(0)
    expect(digest.articles).toHaveLength(3)
    expect(digest.articles.every((article) => !article.isExploration)).toBe(true)
    expect(progressSteps.map((progress) => progress.step)).not.toContain('analyzing')
    expect(database.prepare('SELECT COUNT(*) AS rankedCount FROM articles WHERE digest_rank IS NOT NULL').get()).toEqual({
      rankedCount: 0
    })
  })

  it('remonte les articles proches des 👍 et réserve deux places à l exploration', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 1)
    seedTopicArticles(database, 'python', 15, 1)
    seedTopicArticles(database, 'rust', 15, 5)
    const embeddingProvider = createKeywordEmbeddingProvider(['rust', 'python'])

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider,
      random: () => 0
    })

    expect(digest.articles).toHaveLength(DAILY_DIGEST_SIZE)
    const rustPositions = digest.articles
      .map((article, articlePosition) => (article.url.includes('/rust-') ? articlePosition : -1))
      .filter((articlePosition) => articlePosition >= 0)
    expect(rustPositions.slice(0, 6)).toEqual([0, 1, 2, 3, 4, 5])
    const explorationPositions = digest.articles
      .map((article, articlePosition) => (article.isExploration ? articlePosition : -1))
      .filter((articlePosition) => articlePosition >= 0)
    expect(explorationPositions).toEqual([6, 13])
    expect(getUserProfile(database).recommendationMode).toBe('similarity')
  })

  it('privilégie les sujets suivis à l intégration', async () => {
    const database = createTestDatabase()
    database.prepare("INSERT INTO topic_preferences (topic_id, preference) VALUES ('python', 'followed')").run()
    seedTopicArticles(database, 'rust', 6, 1)
    seedTopicArticles(database, 'python', 6, 4)
    const embeddingProvider = createKeywordEmbeddingProvider(['rust', 'python'])

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider,
      random: () => 0
    })

    expect(digest.articles.slice(0, 3).every((article) => article.url.includes('/python-'))).toBe(true)
  })

  it('exclut du fil les articles dont le sujet le plus proche est masqué', async () => {
    const database = createTestDatabase()
    database.prepare("INSERT INTO topic_preferences (topic_id, preference) VALUES ('python', 'followed')").run()
    database.prepare("INSERT INTO topic_preferences (topic_id, preference) VALUES ('php', 'muted')").run()
    seedTopicArticles(database, 'python', 3, 1)
    seedTopicArticles(database, 'php', 3, 1)
    const embeddingProvider = createKeywordEmbeddingProvider(['python', 'php'])

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider,
      random: () => 0
    })

    expect(digest.articles.map((article) => article.url.split('/').at(-1)).sort()).toEqual([
      'python-1',
      'python-2',
      'python-3'
    ])
  })

  it('explique la sélection de chaque article du fil recommandé', async () => {
    const database = createTestDatabase()
    database.prepare("INSERT INTO topic_preferences (topic_id, preference) VALUES ('python', 'followed')").run()
    seedTopicArticles(database, 'python', 15, 1)
    seedTopicArticles(database, 'rust', 15, 1)
    const embeddingProvider = createKeywordEmbeddingProvider(['python', 'rust'])

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider,
      random: () => 0
    })

    const reasonBySlug = new Map(
      digest.articles.map((article) => [article.url.split('/').at(-1), article.recommendationReason])
    )
    expect(reasonBySlug.get('python-1')).toEqual({
      mode: 'similarity',
      closestTopicLabel: 'Python',
      dominantSignal: 'similar-content'
    })
    expect(
      digest.articles.filter((article) => article.isExploration).map((article) => article.recommendationReason?.dominantSignal)
    ).toEqual(['exploration', 'exploration'])
  })

  it('explique le fil du démarrage à froid par la fraîcheur des articles', async () => {
    const database = createTestDatabase()
    seedTopicArticles(database, 'rust', 2, 1)

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider: createKeywordEmbeddingProvider(['rust'])
    })

    expect(digest.articles.map((article) => article.recommendationReason)).toEqual([
      { mode: 'cold-start', closestTopicLabel: null, dominantSignal: 'recency' },
      { mode: 'cold-start', closestTopicLabel: null, dominantSignal: 'recency' }
    ])
  })

  it('explique le repli sur le tourniquet par l indisponibilité du modèle', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 1)
    seedTopicArticles(database, 'rust', 2, 1)

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider: createKeywordEmbeddingProvider(['rust'], { failure: new Error('modèle indisponible') })
    })

    expect(digest.articles.map((article) => article.recommendationReason)).toEqual([
      { mode: 'unavailable', closestTopicLabel: null, dominantSignal: 'recency' },
      { mode: 'unavailable', closestTopicLabel: null, dominantSignal: 'recency' }
    ])
  })

  it('ne retient que l article en français en mode similarité', async () => {
    const database = createTestDatabase()
    database.prepare("INSERT INTO topic_preferences (topic_id, preference) VALUES ('python', 'followed')").run()
    insertTestArticle(database, {
      sourceId: addTestSource(database, 'Blog anglais'),
      slug: 'python-anglais',
      title: 'What is new in the Python release for your team 1',
      publishedAt: daysBefore(FIXED_NOW, 1)
    })
    insertTestArticle(database, {
      sourceId: addTestSource(database, 'Blog français'),
      slug: 'python-francais',
      title: 'Les nouveautés de Python pour les développeurs 2',
      publishedAt: daysBefore(FIXED_NOW, 2)
    })
    const embeddingProvider = createKeywordEmbeddingProvider(['python'])

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider,
      random: () => 0
    })

    expect(digest.articles.map((article) => article.url.split('/').at(-1))).toEqual(['python-francais'])
  })

  it('passe en apprentissage supervisé avec assez de 👍 et de 👎', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 12)
    rateTopicArticles(database, 'python', 'dislike', 12)
    seedTopicArticles(database, 'python', 6, 1)
    seedTopicArticles(database, 'rust', 6, 8)
    const embeddingProvider = createKeywordEmbeddingProvider(['rust', 'python'])

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider,
      random: () => 0
    })

    expect(getUserProfile(database).recommendationMode).toBe('trained')
    expect(digest.articles.slice(0, 6).every((article) => article.url.includes('/rust-'))).toBe(true)
  })

  it('publie le téléchargement du modèle jusqu à ce que le fournisseur signale le modèle prêt', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 1)
    seedTopicArticles(database, 'rust', 2, 1)
    const progressSteps: PreparationProgress[] = []
    const embeddingProvider = createKeywordEmbeddingProvider(['rust'], { isModelDownloadRequired: true })
    const embedWithModelReady = embeddingProvider.embed
    let stepPublishedWhenEmbeddingStarted: PreparationProgress['step'] | undefined
    embeddingProvider.embed = (texts, embedOptions) => {
      stepPublishedWhenEmbeddingStarted = progressSteps.at(-1)?.step
      return embedWithModelReady(texts, embedOptions)
    }

    await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider,
      onProgress: (progress) => progressSteps.push(progress)
    })

    expect(stepPublishedWhenEmbeddingStarted).toBe('downloading-model')
    expect(listDistinctSteps(progressSteps)).toEqual([
      'purging',
      'collecting',
      'downloading-model',
      'analyzing',
      'building-digest',
      'done'
    ])
  })

  it('ne publie pas le téléchargement quand le modèle est déjà en cache', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 1)
    seedTopicArticles(database, 'rust', 2, 1)
    const progressSteps: PreparationProgress[] = []

    await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider: createKeywordEmbeddingProvider(['rust']),
      onProgress: (progress) => progressSteps.push(progress)
    })

    expect(listDistinctSteps(progressSteps)).toEqual([
      'purging',
      'collecting',
      'analyzing',
      'building-digest',
      'done'
    ])
  })

  it('retombe sur le tourniquet sans lever d erreur quand le fournisseur échoue', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 1)
    seedTopicArticles(database, 'rust', 3, 5)
    seedTopicArticles(database, 'python', 3, 1)
    const embeddingProvider = createKeywordEmbeddingProvider(['rust'], { failure: new Error('modèle indisponible') })

    const digest = await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => FIXED_NOW,
      embeddingProvider
    })

    expect(embeddingProvider.embedCallCount).toBe(1)
    expect(digest.articles.map((article) => article.url.split('/').at(-1)?.split('-')[0])).toEqual([
      'python',
      'python',
      'python',
      'rust',
      'rust',
      'rust'
    ])
    expect(digest.articles.every((article) => !article.isExploration)).toBe(true)
    expect(getUserProfile(database).recommendationMode).toBe('unavailable')
  })

  it('retombe sur le tourniquet quand aucun fournisseur n est fourni alors qu un profil existe', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 1)
    seedTopicArticles(database, 'rust', 2, 1)

    const digest = await prepareDailyDigest(database, { fetchFeed: emptyFeedFetcher, now: () => FIXED_NOW })

    expect(digest.articles).toHaveLength(2)
    expect(getUserProfile(database).recommendationMode).toBe('unavailable')
  })

  it('retrouve le mode similarité au fil suivant quand le fournisseur refonctionne', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 1)
    seedTopicArticles(database, 'rust', 2, 1)
    const nextDay = new Date(FIXED_NOW.getTime() + 24 * 60 * 60 * 1000)

    await prepareDailyDigest(database, { fetchFeed: emptyFeedFetcher, now: () => FIXED_NOW })
    await prepareDailyDigest(database, {
      fetchFeed: emptyFeedFetcher,
      now: () => nextDay,
      embeddingProvider: createKeywordEmbeddingProvider(['rust'])
    })

    expect(getUserProfile(database).recommendationMode).toBe('similarity')
  })

  it('calcule chaque embedding une seule fois et ne relance pas le modèle sans nouveauté', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 1)
    seedTopicArticles(database, 'rust', 2, 1)
    const embeddingProvider = createKeywordEmbeddingProvider(['rust'])
    const nextDay = new Date(FIXED_NOW.getTime() + 24 * 60 * 60 * 1000)

    await prepareDailyDigest(database, { fetchFeed: emptyFeedFetcher, now: () => FIXED_NOW, embeddingProvider })
    const embeddedTextCountAfterFirstDigest = embeddingProvider.embeddedTexts.length
    await prepareDailyDigest(database, { fetchFeed: emptyFeedFetcher, now: () => nextDay, embeddingProvider })

    expect(embeddingProvider.embedCallCount).toBe(1)
    expect(embeddingProvider.embeddedTexts).toHaveLength(embeddedTextCountAfterFirstDigest)
    expect(new Set(embeddingProvider.embeddedTexts).size).toBe(embeddingProvider.embeddedTexts.length)
  })

  it('calcule aussi l embedding des articles notés pour construire le profil', async () => {
    const database = createTestDatabase()
    rateTopicArticles(database, 'rust', 'like', 1)
    const embeddingProvider = createKeywordEmbeddingProvider(['rust'])

    await prepareDailyDigest(database, { fetchFeed: emptyFeedFetcher, now: () => FIXED_NOW, embeddingProvider })

    expect(embeddingProvider.embeddedTexts).toContain(`Le point de la semaine sur note-rust-${RATED_ARTICLE_VARIANT_OFFSET + 1}`)
  })
})
