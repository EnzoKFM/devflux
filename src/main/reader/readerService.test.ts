import { describe, expect, it } from 'vitest'
import { addTestSource, createTestDatabase, daysBefore, FIXED_NOW, insertTestArticle } from '../testing/testHelpers'
import { findArticleById } from '../repositories/articleRepository'
import { loadArticleContent } from './readerService'

const PAGE_HTML = `<!DOCTYPE html><html><head><title>Article</title></head><body>
<article><h1>Article</h1>
<p>${'Un paragraphe suffisamment long pour être retenu par Readability. '.repeat(30)}</p>
<p>${'Un second paragraphe tout aussi long pour le contenu principal. '.repeat(30)}</p>
</article></body></html>`

const SHORT_PAGE_HTML = `<!DOCTYPE html><html><head><title>Brève</title></head><body>
<article><h1>Brève</h1>
<p>${'Une brève de quelques mots seulement, sans plus. '.repeat(9)}</p>
</article></body></html>`

describe('loadArticleContent', () => {
  it('enregistre le nombre de mots de l article extrait pour estimer son temps de lecture', async () => {
    const database = createTestDatabase()
    const articleId = insertTestArticle(database, {
      sourceId: addTestSource(database, 'Blog Un'),
      slug: 'lecture',
      publishedAt: daysBefore(FIXED_NOW, 1)
    })

    const content = await loadArticleContent(database, articleId, async () => new Response(PAGE_HTML, { status: 200 }))

    expect(content.contentHtml).not.toBeNull()
    expect(findArticleById(database, articleId)?.wordCount).toBeGreaterThanOrEqual(500)
  })

  it('conserve le nombre de mots connu quand l extraction échoue', async () => {
    const database = createTestDatabase()
    const articleId = insertTestArticle(database, {
      sourceId: addTestSource(database, 'Blog Un'),
      slug: 'echec',
      publishedAt: daysBefore(FIXED_NOW, 1)
    })
    database.prepare('UPDATE articles SET word_count = 900 WHERE id = ?').run(articleId)

    await loadArticleContent(database, articleId, async () => new Response('Introuvable', { status: 404 }))

    expect(findArticleById(database, articleId)?.wordCount).toBe(900)
  })

  it('n enregistre pas de temps de lecture pour un contenu extrait trop court', async () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    const unknownLengthArticleId = insertTestArticle(database, { sourceId, slug: 'court', publishedAt: daysBefore(FIXED_NOW, 1) })
    const knownLengthArticleId = insertTestArticle(database, { sourceId, slug: 'paywall', publishedAt: daysBefore(FIXED_NOW, 1) })
    database.prepare('UPDATE articles SET word_count = 900 WHERE id = ?').run(knownLengthArticleId)
    const fetchShortPage = async () => new Response(SHORT_PAGE_HTML, { status: 200 })

    const shortContent = await loadArticleContent(database, unknownLengthArticleId, fetchShortPage)
    await loadArticleContent(database, knownLengthArticleId, fetchShortPage)

    expect(shortContent.contentHtml).not.toBeNull()
    expect(findArticleById(database, unknownLengthArticleId)?.wordCount).toBeNull()
    expect(findArticleById(database, knownLengthArticleId)?.wordCount).toBe(900)
  })

  it('refuse un article inconnu', async () => {
    const database = createTestDatabase()

    await expect(loadArticleContent(database, 999, async () => new Response(PAGE_HTML))).rejects.toThrow('Article introuvable')
  })
})
