import type { SourcesImportReport } from '@shared/contract'
import { pluralize } from './pluralize'

export function describeSourcesImportReport(importReport: SourcesImportReport): string {
  return [
    pluralize(importReport.importedCount, 'source importée', 'sources importées'),
    importReport.skippedCount > 0
      ? pluralize(importReport.skippedCount, 'déjà présente ignorée', 'déjà présentes ignorées')
      : null,
    importReport.rejectedCount > 0
      ? pluralize(importReport.rejectedCount, 'adresse invalide écartée', 'adresses invalides écartées')
      : null
  ]
    .filter((reportPart) => reportPart !== null)
    .join(', ')
}
