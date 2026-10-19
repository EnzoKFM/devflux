import type { CollectionReport } from '@shared/contract'
import { pluralize } from './pluralize'

export function summarizeCollectionReport(collectionReport: CollectionReport): string {
  const succeededSourcesLabel = pluralize(collectionReport.succeededSourceCount, 'source OK', 'sources OK')
  const failedSourcesLabel = `${collectionReport.failedSourceCount} en erreur`
  const newArticlesLabel = pluralize(collectionReport.newArticleCount, 'nouvel article', 'nouveaux articles')
  return [succeededSourcesLabel, failedSourcesLabel, newArticlesLabel].join(' · ')
}
