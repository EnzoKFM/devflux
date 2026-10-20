import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Source } from '@shared/contract'
import { buildSourcesOpml, OPML_DEFAULT_CATEGORY, OPML_MAX_FILE_SIZE_IN_BYTES, parseSourcesOpml, readOpmlFile } from './opml'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const temporaryDirectory of temporaryDirectories.splice(0)) {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

function writeTemporaryOpmlFile(content: string): string {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'devflux-opml-'))
  temporaryDirectories.push(temporaryDirectory)
  const opmlFilePath = join(temporaryDirectory, 'sources.opml')
  writeFileSync(opmlFilePath, content, 'utf8')
  return opmlFilePath
}

function buildSource(overrides: Partial<Source>): Source {
  return {
    id: 1,
    name: 'Blog',
    feedUrl: 'https://blog.example.com/feed.xml',
    siteUrl: null,
    category: 'web',
    isEnabled: true,
    lastFetchedAt: null,
    lastSucceededAt: null,
    lastError: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    recentArticleCount: 0,
    ...overrides
  }
}

describe('buildSourcesOpml', () => {
  it('produit un OPML 2.0 dont les attributs sont échappés', () => {
    const opmlText = buildSourcesOpml([
      buildSource({
        name: 'Tom & "Jerry" <dev>',
        feedUrl: 'https://tom.example.com/feed?a=1&b=2',
        siteUrl: 'https://tom.example.com',
        category: 'software'
      }),
      buildSource({ name: 'Sans site', feedUrl: 'https://sans.example.com/rss' })
    ])

    expect(opmlText).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<opml version="2.0">',
        '  <head>',
        '    <title>Sources DevFlux</title>',
        '  </head>',
        '  <body>',
        '    <outline type="rss" text="Tom &amp; &quot;Jerry&quot; &lt;dev&gt;" title="Tom &amp; &quot;Jerry&quot; &lt;dev&gt;" xmlUrl="https://tom.example.com/feed?a=1&amp;b=2" htmlUrl="https://tom.example.com" category="software"/>',
        '    <outline type="rss" text="Sans site" title="Sans site" xmlUrl="https://sans.example.com/rss" category="web"/>',
        '  </body>',
        '</opml>',
        ''
      ].join('\n')
    )
  })

  it('relit à l identique les sources qu il exporte', () => {
    const exportedSources = [
      buildSource({ name: 'Tom & Jerry', feedUrl: 'https://tom.example.com/feed?a=1&b=2', siteUrl: 'https://tom.example.com/', category: 'software' }),
      buildSource({ name: 'Été', feedUrl: 'https://ete.example.com/rss', category: 'general' })
    ]

    expect(parseSourcesOpml(buildSourcesOpml(exportedSources)).newSources).toEqual([
      { name: 'Tom & Jerry', feedUrl: 'https://tom.example.com/feed?a=1&b=2', siteUrl: 'https://tom.example.com/', category: 'software' },
      { name: 'Été', feedUrl: 'https://ete.example.com/rss', siteUrl: null, category: 'general' }
    ])
  })
})

describe('parseSourcesOpml', () => {
  it('lit les flux rangés dans des dossiers et complète nom et catégorie manquants', () => {
    const opmlText = `<?xml version="1.0"?>
      <opml version="1.0"><body>
        <outline text="Dossier">
          <outline title="Titre seul" xmlUrl="https://titre.example.com/feed" category="inconnue"/>
          <outline xmlUrl="https://anonyme.example.com/rss"/>
        </outline>
      </body></opml>`

    expect(parseSourcesOpml(opmlText)).toEqual({
      newSources: [
        { name: 'Titre seul', feedUrl: 'https://titre.example.com/feed', siteUrl: null, category: OPML_DEFAULT_CATEGORY },
        { name: 'anonyme.example.com', feedUrl: 'https://anonyme.example.com/rss', siteUrl: null, category: OPML_DEFAULT_CATEGORY }
      ],
      rejectedFeedCount: 0
    })
  })

  it('écarte et compte les adresses qui ne sont pas http ou https', () => {
    const opmlText = `<opml><body>
      <outline text="Fichier" xmlUrl="file:///etc/passwd"/>
      <outline text="Script" xmlUrl="javascript:alert(1)" htmlUrl="javascript:alert(2)"/>
      <outline text="Valide" xmlUrl="https://valide.example.com/feed" htmlUrl="javascript:alert(3)"/>
    </body></opml>`

    expect(parseSourcesOpml(opmlText)).toEqual({
      newSources: [
        { name: 'Valide', feedUrl: 'https://valide.example.com/feed', siteUrl: null, category: OPML_DEFAULT_CATEGORY }
      ],
      rejectedFeedCount: 2
    })
  })

  it('renvoie une liste vide pour un contenu qui n est pas de l OPML', () => {
    expect(parseSourcesOpml('pas du tout du XML <<')).toEqual({ newSources: [], rejectedFeedCount: 0 })
  })
})

describe('readOpmlFile', () => {
  it('lit un fichier OPML de taille raisonnable', () => {
    expect(readOpmlFile(writeTemporaryOpmlFile('<opml></opml>'))).toBe('<opml></opml>')
  })

  it('refuse un fichier trop volumineux sans le lire', () => {
    const oversizedOpmlFilePath = writeTemporaryOpmlFile('a'.repeat(OPML_MAX_FILE_SIZE_IN_BYTES + 1))

    expect(() => readOpmlFile(oversizedOpmlFilePath)).toThrow('trop volumineux')
  })
})
