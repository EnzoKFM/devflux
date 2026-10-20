import { describe, expect, it } from 'vitest'
import { addTestSource, createTestDatabase, daysBefore, FIXED_NOW, insertTestArticle } from '../testing/testHelpers'
import {
  buildFullTextQuery,
  findArticleById,
  recordArticleWordCount,
  SEARCH_RESULT_LIMIT,
  searchArticles
} from './articleRepository'

function listResultSlugs(database: ReturnType<typeof createTestDatabase>, rawQuery: string): string[] {
  return searchArticles(database, rawQuery).map((article) => article.url.split('/').at(-1) ?? '')
}

describe('buildFullTextQuery', () => {
  it('cherche chaque mot comme préfixe, tous les mots devant être présents', () => {
    expect(buildFullTextQuery('  Rust   async ')).toBe('"rust"* "async"*')
  })

  it('neutralise la syntaxe FTS5 saisie par l utilisateur', () => {
    expect(buildFullTextQuery('"NEAR(a b)" OR -c*')).toBe('"near"* "a"* "b"* "or"* "c"*')
  })

  it('renvoie null quand la saisie ne contient aucun mot', () => {
    expect(buildFullTextQuery('   ')).toBeNull()
    expect(buildFullTextQuery('" * ( )')).toBeNull()
  })
})

describe('searchArticles', () => {
  it('trouve les articles par titre, résumé ou source sans tenir compte des accents ni de la casse', () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    insertTestArticle(database, { sourceId, slug: 'titre', title: 'Les Générateurs en JavaScript', publishedAt: daysBefore(FIXED_NOW, 1) })
    const summaryArticleId = insertTestArticle(database, { sourceId, slug: 'resume', title: 'Sans rapport', publishedAt: daysBefore(FIXED_NOW, 2) })
    database.prepare("UPDATE articles SET summary = 'Un tour des générateurs asynchrones' WHERE id = ?").run(summaryArticleId)
    insertTestArticle(database, { sourceId, slug: 'autre', title: 'Programmation fonctionnelle', publishedAt: daysBefore(FIXED_NOW, 3) })

    expect(listResultSlugs(database, 'generateur').sort()).toEqual(['resume', 'titre'])
    expect(listResultSlugs(database, 'GÉNÉRATEURS asynchrones')).toEqual(['resume'])
    expect(listResultSlugs(database, 'source de test')).toHaveLength(3)
  })

  it('ne renvoie plus un article supprimé par la purge', () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    const articleId = insertTestArticle(database, { sourceId, slug: 'purge', title: 'Kubernetes en production', publishedAt: daysBefore(FIXED_NOW, 1) })

    database.prepare('DELETE FROM articles WHERE id = ?').run(articleId)

    expect(searchArticles(database, 'kubernetes')).toEqual([])
  })

  it('accepte une saisie contenant de la syntaxe FTS5 sans lever d erreur', () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    insertTestArticle(database, { sourceId, slug: 'near', title: 'Near et or au menu', publishedAt: daysBefore(FIXED_NOW, 1) })

    expect(listResultSlugs(database, 'NEAR( OR "')).toEqual(['near'])
    expect(searchArticles(database, '   ')).toEqual([])
  })

  it(`limite les résultats à ${SEARCH_RESULT_LIMIT} articles, les plus récents d abord à pertinence égale`, () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    for (let articleNumber = 1; articleNumber <= SEARCH_RESULT_LIMIT + 5; articleNumber += 1) {
      insertTestArticle(database, {
        sourceId,
        slug: `docker-${articleNumber}`,
        title: 'Docker au quotidien',
        publishedAt: daysBefore(FIXED_NOW, articleNumber * 0.01)
      })
    }

    const resultSlugs = listResultSlugs(database, 'docker')

    expect(resultSlugs).toHaveLength(SEARCH_RESULT_LIMIT)
    expect(resultSlugs.slice(0, 2)).toEqual(['docker-1', 'docker-2'])
  })
})

describe('recordArticleWordCount', () => {
  it('expose le nombre de mots enregistré pour l article', () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    const articleId = insertTestArticle(database, { sourceId, slug: 'mots', publishedAt: daysBefore(FIXED_NOW, 1) })

    expect(findArticleById(database, articleId)?.wordCount).toBeNull()
    recordArticleWordCount(database, articleId, 1200)

    expect(findArticleById(database, articleId)?.wordCount).toBe(1200)
  })
})
