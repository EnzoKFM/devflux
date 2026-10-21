import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import type { ArticleContent } from '@shared/contract'
import { decodeResponseText, HTML_META_CHARSET_PATTERN } from '../textDecoding'

export const ARTICLE_FETCH_TIMEOUT_IN_MS = 20_000
export const ARTICLE_USER_AGENT = 'DevFlux/0.1'

type ReadabilityDocument = ConstructorParameters<typeof Readability>[0]

export type PageFetcher = (pageUrl: string, abortSignal: AbortSignal) => Promise<Response>

export interface ArticleReference {
  articleId: number
  title: string
  url: string
}

const defaultPageFetcher: PageFetcher = (pageUrl, abortSignal) =>
  fetch(pageUrl, {
    signal: abortSignal,
    redirect: 'follow',
    headers: { 'User-Agent': ARTICLE_USER_AGENT, Accept: 'text/html,application/xhtml+xml' }
  })

function toAbsoluteUrl(rawUrl: string, baseUrl: string): string {
  try {
    return new URL(rawUrl, baseUrl).href
  } catch {
    return rawUrl
  }
}

function absolutifyContent(contentHtml: string, baseUrl: string): string {
  const { document } = parseHTML(`<!DOCTYPE html><html><body>${contentHtml}</body></html>`)
  for (const attributeName of ['href', 'src']) {
    for (const element of document.querySelectorAll(`[${attributeName}]`)) {
      const attributeValue = element.getAttribute(attributeName)
      if (attributeValue) {
        element.setAttribute(attributeName, toAbsoluteUrl(attributeValue, baseUrl))
      }
    }
  }
  return document.body.innerHTML
}

async function fetchPageHtml(
  pageUrl: string,
  fetchPage: PageFetcher,
  timeoutInMs: number
): Promise<{ html: string; finalUrl: string }> {
  const response = await fetchPage(pageUrl, AbortSignal.timeout(timeoutInMs))
  if (!response.ok) {
    throw new Error(`Réponse HTTP ${response.status}`)
  }
  const html = await decodeResponseText(response, HTML_META_CHARSET_PATTERN)
  return { html, finalUrl: response.url || pageUrl }
}

export async function extractArticleContent(
  articleReference: ArticleReference,
  fetchPage: PageFetcher = defaultPageFetcher,
  timeoutInMs: number = ARTICLE_FETCH_TIMEOUT_IN_MS
): Promise<ArticleContent> {
  const failedContent: ArticleContent = {
    articleId: articleReference.articleId,
    title: articleReference.title,
    byline: null,
    url: articleReference.url,
    contentHtml: null
  }

  try {
    const { html, finalUrl } = await fetchPageHtml(articleReference.url, fetchPage, timeoutInMs)
    const { document } = parseHTML(html)
    const parsedArticle = new Readability(document as unknown as ReadabilityDocument).parse()
    if (!parsedArticle?.content) {
      return failedContent
    }
    return {
      articleId: articleReference.articleId,
      title: parsedArticle.title || articleReference.title,
      byline: parsedArticle.byline?.trim() || null,
      url: articleReference.url,
      contentHtml: absolutifyContent(parsedArticle.content, finalUrl)
    }
  } catch {
    return failedContent
  }
}
