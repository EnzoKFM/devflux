import { useSources } from '@renderer/hooks/useSources'
import { pluralize } from '@renderer/lib/pluralize'
import { resolveSourceHealth } from '@renderer/lib/sourceHealth'
import { AddSourceForm } from './AddSourceForm'
import { ErrorBanner } from './ErrorBanner'
import { SourceItem } from './SourceItem'

export function SourcesView() {
  const {
    sourcesResource,
    actionErrorMessage,
    transferMessage,
    isTransferring,
    toggleSourceEnabled,
    removeSource,
    addSource,
    importSourcesOpml,
    exportSourcesOpml
  } = useSources()

  const renderHealthSummary = () => {
    if (sourcesResource.status !== 'success') {
      return null
    }
    const now = new Date()
    const sourceStatuses = sourcesResource.value.map((source) => resolveSourceHealth(source, now).status)
    const failingSourceCount = sourceStatuses.filter((sourceStatus) => sourceStatus === 'failing').length
    const silentSourceCount = sourceStatuses.filter((sourceStatus) => sourceStatus === 'silent').length
    const summaryParts = [
      failingSourceCount > 0 ? pluralize(failingSourceCount, 'source en erreur', 'sources en erreur') : null,
      silentSourceCount > 0 ? pluralize(silentSourceCount, 'source muette', 'sources muettes') : null
    ].filter((summaryPart) => summaryPart !== null)
    if (summaryParts.length === 0) {
      return null
    }
    return (
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{summaryParts.join(' · ')}</p>
    )
  }

  const renderSources = () => {
    if (sourcesResource.status === 'loading') {
      return (
        <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
          Chargement des sources…
        </p>
      )
    }

    if (sourcesResource.status === 'error') {
      return (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-red-700 dark:text-red-300">Impossible de charger les sources. {sourcesResource.errorMessage}</p>
          <button
            type="button"
            onClick={sourcesResource.reload}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Réessayer
          </button>
        </div>
      )
    }

    if (sourcesResource.value.length === 0) {
      return <p className="text-sm text-slate-500 dark:text-slate-400">Aucune source configurée.</p>
    }

    return (
      <ul className="flex flex-col gap-3">
        {sourcesResource.value.map((source) => (
          <SourceItem key={source.id} source={source} onToggleEnabled={toggleSourceEnabled} onRemove={removeSource} />
        ))}
      </ul>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sources</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTransferring}
              onClick={importSourcesOpml}
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              Importer OPML
            </button>
            <button
              type="button"
              disabled={isTransferring}
              onClick={exportSourcesOpml}
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              Exporter OPML
            </button>
          </div>
        </div>
        <AddSourceForm onAddSource={addSource} />
        {actionErrorMessage && <ErrorBanner message={actionErrorMessage} />}
        {transferMessage && (
          <p role="status" className="text-sm text-slate-700 dark:text-slate-300">
            {transferMessage}
          </p>
        )}
        {renderHealthSummary()}
        {renderSources()}
      </div>
    </div>
  )
}
