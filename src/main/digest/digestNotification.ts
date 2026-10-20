import type { DailyDigest } from '@shared/contract'
import { pluralize } from '@shared/pluralize'

export interface DigestReadyNotification {
  title: string
  body: string
}

export function buildDigestReadyNotification(dailyDigest: DailyDigest): DigestReadyNotification | null {
  if (!dailyDigest.collectionReport || dailyDigest.articles.length === 0) {
    return null
  }
  const newArticleCount = dailyDigest.collectionReport.newArticleCount
  const selectedArticles = pluralize(dailyDigest.articles.length, 'article sélectionné', 'articles sélectionnés')
  const collectedArticles =
    newArticleCount === 0
      ? 'aucun nouvel article collecté'
      : pluralize(newArticleCount, 'nouvel article collecté', 'nouveaux articles collectés')
  return {
    title: 'Votre fil du jour est prêt',
    body: `${selectedArticles} · ${collectedArticles}.`
  }
}
