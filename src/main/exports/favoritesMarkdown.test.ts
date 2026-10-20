import { describe, expect, it } from 'vitest'
import type { DigestArticle } from '@shared/contract'
import { buildFavoritesMarkdown } from './favoritesMarkdown'

function buildArticle(overrides: Partial<DigestArticle>): DigestArticle {
  return {
    id: 1,
    title: 'Titre',
    url: 'https://blog.example.com/a',
    summary: null,
    sourceName: 'Blog',
    publishedAt: '2026-10-18T08:00:00.000Z',
    isRead: false,
    isFavorite: true,
    isReadLater: false,
    rating: null,
    feedbackReason: null,
    isExploration: false,
    recommendationReason: null,
    wordCount: null,
    ...overrides
  }
}

describe('buildFavoritesMarkdown', () => {
  it('liste les favoris en liens Markdown avec source, date et résumé', () => {
    expect(
      buildFavoritesMarkdown([
        buildArticle({
          title: 'Les [crochets] et *étoiles*',
          url: 'https://blog.example.com/a_(b)',
          summary: 'Un résumé\nsur deux lignes',
          sourceName: 'Blog Un'
        }),
        buildArticle({ title: 'Sans résumé', url: 'https://blog.example.com/c', publishedAt: '2026-10-10T08:00:00.000Z' })
      ])
    ).toBe(
      [
        '# Favoris DevFlux',
        '',
        '- [Les \\[crochets\\] et \\*étoiles\\*](<https://blog.example.com/a_(b)>) — Blog Un, 2026-10-18',
        '  > Un résumé sur deux lignes',
        '- [Sans résumé](<https://blog.example.com/c>) — Blog, 2026-10-10',
        ''
      ].join('\n')
    )
  })

  it('neutralise le HTML du titre et du résumé', () => {
    expect(
      buildFavoritesMarkdown([
        buildArticle({ title: 'Le <b>gras</b>', summary: 'Avant <script>alert(1)</script> après' })
      ])
    ).toContain(
      [
        '- [Le \\<b\\>gras\\</b\\>](<https://blog.example.com/a>) — Blog, 2026-10-18',
        '  > Avant \\<script\\>alert(1)\\</script\\> après'
      ].join('\n')
    )
  })

  it('signale l absence de favoris', () => {
    expect(buildFavoritesMarkdown([])).toBe('# Favoris DevFlux\n\nAucun favori pour le moment.\n')
  })
})
