import { describe, expect, it } from 'vitest'
import { normalizeUrl } from './urlNormalizer'

describe('normalizeUrl', () => {
  it('met le host en minuscules', () => {
    expect(normalizeUrl('https://Blog.EXAMPLE.com/Post')).toBe('https://blog.example.com/Post')
  })

  it('supprime le fragment', () => {
    expect(normalizeUrl('https://example.com/post#section-2')).toBe('https://example.com/post')
  })

  it('supprime les paramètres de suivi et conserve les autres', () => {
    expect(
      normalizeUrl('https://example.com/post?id=7&utm_source=rss&UTM_Medium=feed&ref=home&fbclid=abc&gclid=def&page=2')
    ).toBe('https://example.com/post?id=7&page=2')
  })

  it('retire le point d interrogation quand il ne reste aucun paramètre', () => {
    expect(normalizeUrl('https://example.com/post?utm_campaign=x')).toBe('https://example.com/post')
  })

  it('supprime le slash final hors racine', () => {
    expect(normalizeUrl('https://example.com/blog/post/')).toBe('https://example.com/blog/post')
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/')
  })

  it('rend identiques des variantes de la même adresse', () => {
    expect(normalizeUrl('https://EXAMPLE.com/a/?utm_source=x#top')).toBe(normalizeUrl('https://example.com/a'))
  })

  it('renvoie la valeur nettoyée quand ce n est pas une URL', () => {
    expect(normalizeUrl('  pas une url  ')).toBe('pas une url')
  })
})
