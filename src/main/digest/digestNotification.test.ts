import { describe, expect, it } from 'vitest'
import type { DailyDigest, DigestArticle } from '@shared/contract'
import { buildDigestReadyNotification } from './digestNotification'

function buildDigest(articleCount: number, newArticleCount: number | null): DailyDigest {
  return {
    digestDate: '2026-10-19',
    articles: Array.from({ length: articleCount }, (_unused, articleIndex) => ({ id: articleIndex + 1 }) as DigestArticle),
    collectionReport:
      newArticleCount === null
        ? null
        : { succeededSourceCount: 3, failedSourceCount: 0, newArticleCount, purgedArticleCount: 0 }
  }
}

describe('buildDigestReadyNotification', () => {
  it('annonce le nombre d articles du fil qui vient d être préparé', () => {
    expect(buildDigestReadyNotification(buildDigest(20, 57))).toEqual({
      title: 'Votre fil du jour est prêt',
      body: '20 articles sélectionnés · 57 nouveaux articles collectés.'
    })
  })

  it('accorde le singulier', () => {
    expect(buildDigestReadyNotification(buildDigest(1, 1))?.body).toBe('1 article sélectionné · 1 nouvel article collecté.')
  })

  it('ne présente pas le fil comme tiré des seuls nouveaux articles quand la collecte n apporte rien', () => {
    expect(buildDigestReadyNotification(buildDigest(20, 0))?.body).toBe('20 articles sélectionnés · aucun nouvel article collecté.')
  })

  it('ne notifie pas un fil déjà préparé plus tôt dans la journée', () => {
    expect(buildDigestReadyNotification(buildDigest(20, null))).toBeNull()
  })

  it('ne notifie pas un fil vide', () => {
    expect(buildDigestReadyNotification(buildDigest(0, 0))).toBeNull()
  })
})
