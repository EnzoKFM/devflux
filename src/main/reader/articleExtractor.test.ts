import { describe, expect, it } from 'vitest'
import { extractArticleContent } from './articleExtractor'

const ARTICLE_REFERENCE = { articleId: 7, title: 'Titre en base', url: 'https://blog.example.com/posts/hello' }

const PAGE_HTML = `<!DOCTYPE html><html><head><title>Hello - Blog</title></head><body>
<nav><a href="/menu">Menu</a></nav>
<article><h1>Hello</h1>
<p>${'Un paragraphe suffisamment long pour être retenu par Readability. '.repeat(12)}</p>
<p>Voir <a href="/posts/suite">la suite</a> et <img src="images/schema.png" alt="schéma"></p>
<p>${'Un second paragraphe tout aussi long pour le contenu principal. '.repeat(12)}</p>
</article></body></html>`

describe('extractArticleContent', () => {
  it('extrait le contenu et rend les liens relatifs absolus', async () => {
    const content = await extractArticleContent(ARTICLE_REFERENCE, async () => new Response(PAGE_HTML, { status: 200 }))

    expect(content.articleId).toBe(7)
    expect(content.contentHtml).toContain('href="https://blog.example.com/posts/suite"')
    expect(content.contentHtml).toContain('src="https://blog.example.com/posts/images/schema.png"')
  })

  it('renvoie contentHtml null sur une réponse en erreur', async () => {
    const content = await extractArticleContent(ARTICLE_REFERENCE, async () => new Response('Introuvable', { status: 404 }))

    expect(content).toEqual({ ...ARTICLE_REFERENCE, byline: null, contentHtml: null })
  })

  it('renvoie contentHtml null quand la récupération échoue', async () => {
    const content = await extractArticleContent(ARTICLE_REFERENCE, async () => {
      throw new Error('réseau coupé')
    })

    expect(content.contentHtml).toBeNull()
    expect(content.title).toBe('Titre en base')
  })
})
