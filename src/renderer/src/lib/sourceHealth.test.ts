import { describe, expect, it } from 'vitest'
import type { Source } from '@shared/contract'
import { formatAbsoluteDate } from './formatDate'
import { describeSourceHealth, resolveSourceHealth } from './sourceHealth'

const now = new Date('2026-05-20T12:00:00.000Z')

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 1,
    name: 'Korben',
    feedUrl: 'https://korben.info/feed',
    siteUrl: null,
    category: 'general',
    isEnabled: true,
    lastFetchedAt: '2026-05-20T08:00:00.000Z',
    lastSucceededAt: '2026-05-20T08:00:00.000Z',
    lastError: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    recentArticleCount: 12,
    ...overrides
  }
}

describe('resolveSourceHealth', () => {
  it('considère une source qui fournit des articles comme saine', () => {
    expect(resolveSourceHealth(buildSource(), now).status).toBe('healthy')
  })

  it('signale une source désactivée en priorité', () => {
    const disabledFailingSource = buildSource({ isEnabled: false, lastError: 'HTTP 500', recentArticleCount: 0 })
    expect(resolveSourceHealth(disabledFailingSource, now).status).toBe('disabled')
  })

  it('signale une source en erreur', () => {
    expect(resolveSourceHealth(buildSource({ lastError: 'HTTP 500' }), now).status).toBe('failing')
  })

  it('signale une source muette quand elle n’a aucun article récent depuis plus de 7 jours', () => {
    expect(resolveSourceHealth(buildSource({ recentArticleCount: 0 }), now).status).toBe('silent')
  })

  it('signale une source muette ajoutée il y a exactement 7 jours', () => {
    const sevenDaysOldSource = buildSource({ recentArticleCount: 0, createdAt: '2026-05-13T12:00:00.000Z' })
    expect(resolveSourceHealth(sevenDaysOldSource, now).status).toBe('silent')
  })

  it('ne considère pas muette une source ajoutée depuis moins de 7 jours', () => {
    const freshSource = buildSource({ recentArticleCount: 0, createdAt: '2026-05-18T12:00:00.000Z' })
    expect(resolveSourceHealth(freshSource, now).status).toBe('healthy')
  })

  it('met en attente une source récente encore jamais collectée avec succès', () => {
    const pendingSource = buildSource({ lastSucceededAt: null, recentArticleCount: 0, createdAt: '2026-05-19T12:00:00.000Z' })
    expect(resolveSourceHealth(pendingSource, now).status).toBe('pending')
  })

  it('donne priorité à l’erreur sur le silence', () => {
    const failingSilentSource = buildSource({ lastError: 'HTTP 500', recentArticleCount: 0 })
    expect(resolveSourceHealth(failingSilentSource, now).status).toBe('failing')
  })
})

describe('describeSourceHealth', () => {
  it('décrit une source saine avec le nombre d’articles et la dernière collecte réussie', () => {
    const label = resolveSourceHealth(buildSource(), now).label
    expect(label).toBe(`12 articles retenus sur 7 jours · dernière collecte réussie le ${formatAbsoluteDate('2026-05-20T08:00:00.000Z')}`)
  })

  it('accorde le singulier pour un seul article', () => {
    expect(describeSourceHealth(buildSource({ recentArticleCount: 1 }), 'healthy')).toContain('1 article retenu sur 7 jours')
  })

  it('décrit une source muette avec sa dernière collecte réussie', () => {
    expect(describeSourceHealth(buildSource({ recentArticleCount: 0 }), 'silent')).toBe(
      `Aucun article depuis 7 jours · dernière collecte réussie le ${formatAbsoluteDate('2026-05-20T08:00:00.000Z')}`
    )
  })

  it('décrit une source en erreur avec son message et sa dernière collecte réussie', () => {
    const failingSource = buildSource({ lastError: 'HTTP 500', lastSucceededAt: '2026-05-17T08:00:00.000Z' })
    expect(describeSourceHealth(failingSource, 'failing')).toBe(
      `En erreur : HTTP 500 · 12 articles retenus sur 7 jours · dernière collecte réussie le ${formatAbsoluteDate('2026-05-17T08:00:00.000Z')}`
    )
  })

  it('décrit une source en erreur jamais collectée avec succès', () => {
    const neverSucceededSource = buildSource({ lastError: 'HTTP 404', lastSucceededAt: null, recentArticleCount: 0 })
    expect(describeSourceHealth(neverSucceededSource, 'failing')).toBe('En erreur : HTTP 404 · jamais collectée avec succès')
  })

  it('décrit une source en attente de sa première collecte réussie', () => {
    const pendingSource = buildSource({ lastSucceededAt: null, lastFetchedAt: null, recentArticleCount: 0 })
    expect(describeSourceHealth(pendingSource, 'pending')).toBe('Jamais collectée avec succès')
  })

  it('décrit une source désactivée', () => {
    expect(describeSourceHealth(buildSource({ isEnabled: false }), 'disabled')).toBe('Source désactivée')
  })
})
