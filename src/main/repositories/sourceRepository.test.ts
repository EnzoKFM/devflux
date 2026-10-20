import { describe, expect, it } from 'vitest'
import { SOURCE_HEALTH_WINDOW_IN_DAYS } from '@shared/contract'
import { addTestSource, createTestDatabase, daysBefore, FIXED_NOW, insertTestArticle } from '../testing/testHelpers'
import { findSourceById, listSources, recordFetchFailure, recordFetchSuccess } from './sourceRepository'

describe('santé des sources', () => {
  it('conserve la dernière collecte réussie quand une collecte échoue ensuite', () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')

    recordFetchSuccess(database, sourceId, daysBefore(FIXED_NOW, 2))
    recordFetchFailure(database, sourceId, daysBefore(FIXED_NOW, 1), 'Réponse HTTP 500')

    expect(findSourceById(database, sourceId)).toMatchObject({
      lastFetchedAt: daysBefore(FIXED_NOW, 1),
      lastSucceededAt: daysBefore(FIXED_NOW, 2),
      lastError: 'Réponse HTTP 500',
      createdAt: FIXED_NOW.toISOString()
    })
  })

  it(`compte les articles retenus par source sur les ${SOURCE_HEALTH_WINDOW_IN_DAYS} derniers jours`, () => {
    const database = createTestDatabase()
    const activeSourceId = addTestSource(database, 'Blog Actif')
    addTestSource(database, 'Blog Muet')
    insertTestArticle(database, { sourceId: activeSourceId, slug: 'recent', publishedAt: daysBefore(FIXED_NOW, 1) })
    const oldArticleId = insertTestArticle(database, { sourceId: activeSourceId, slug: 'ancien', publishedAt: daysBefore(FIXED_NOW, 9) })
    database
      .prepare('UPDATE articles SET fetched_at = ? WHERE id = ?')
      .run(daysBefore(FIXED_NOW, SOURCE_HEALTH_WINDOW_IN_DAYS + 1), oldArticleId)

    expect(
      listSources(database, FIXED_NOW).map((source) => [source.name, source.recentArticleCount])
    ).toEqual([
      ['Blog Actif', 1],
      ['Blog Muet', 0]
    ])
  })
})
