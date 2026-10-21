import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultFeedFetcher, extractEntryFullContent } from './feedFetcher'

describe('extractEntryFullContent', () => {
  it('lit le contenu complet d une entrée RSS', () => {
    expect(extractEntryFullContent({ 'content:encoded': '<p>Article complet</p>' })).toBe('<p>Article complet</p>')
  })

  it('lit le contenu complet d une entrée Atom, texte simple ou nœud avec attributs', () => {
    expect(extractEntryFullContent({ content: 'Texte Atom' })).toBe('Texte Atom')
    expect(extractEntryFullContent({ content: { '@_type': 'html', '#text': '<p>Atom typé</p>' } })).toBe('<p>Atom typé</p>')
  })

  it('renvoie undefined sans contenu complet exploitable', () => {
    expect(extractEntryFullContent({ description: 'Résumé' })).toBeUndefined()
    expect(extractEntryFullContent({ content: { '@_src': 'https://ailleurs.example.com' } })).toBeUndefined()
  })
})

describe('defaultFeedFetcher', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('décode un flux ISO-8859-15 dont la déclaration XML est collée à la racine et dont le type de contenu n indique pas de charset', async () => {
    const feedXml = [
      '<?xml version="1.0" encoding="ISO-8859-15"?><rdf:RDF',
      'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/">',
      '<channel rdf:about="https://www.lemondeinformatique.fr/"><title>LMI Sécurité</title><link>https://www.lemondeinformatique.fr/</link><description>Actualité</description></channel>',
      '<item rdf:about="https://www.lemondeinformatique.fr/actualites/lire-test-1.html"><title>Cybersécurité : les infrastructures critiques françaises</title><link>https://www.lemondeinformatique.fr/actualites/lire-test-1.html</link><description>Un état des lieux</description></item>',
      '</rdf:RDF>'
    ].join('\n')
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(Buffer.from(feedXml, 'latin1'), {
          status: 200,
          headers: { 'Content-Type': 'application/rss+xml' }
        })
    )

    const feed = await defaultFeedFetcher('https://www.lemondeinformatique.fr/flux-rss/thematique/securite/rss.xml', new AbortController().signal)

    expect(feed.entries?.[0].title).toBe('Cybersécurité : les infrastructures critiques françaises')
  })
})
