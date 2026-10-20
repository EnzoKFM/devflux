import type { DigestArticle } from '@shared/contract'

function escapeMarkdownLinkText(text: string): string {
  return text.replace(/[\\[\]*_`<>]/g, (character) => `\\${character}`)
}

function escapeHtmlTags(text: string): string {
  return text.replace(/[<>]/g, (character) => `\\${character}`)
}

function compactWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function buildFavoriteLines(article: DigestArticle): string[] {
  const linkLine = `- [${escapeMarkdownLinkText(compactWhitespace(article.title))}](<${article.url}>) — ${compactWhitespace(article.sourceName)}, ${article.publishedAt.slice(0, 10)}`
  const summary = article.summary ? escapeHtmlTags(compactWhitespace(article.summary)) : ''
  return summary.length > 0 ? [linkLine, `  > ${summary}`] : [linkLine]
}

export function buildFavoritesMarkdown(favoriteArticles: DigestArticle[]): string {
  if (favoriteArticles.length === 0) {
    return '# Favoris DevFlux\n\nAucun favori pour le moment.\n'
  }
  return ['# Favoris DevFlux', '', ...favoriteArticles.flatMap(buildFavoriteLines), ''].join('\n')
}
