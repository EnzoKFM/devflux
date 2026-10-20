import { useSources } from '@renderer/hooks/useSources'
import { AddSourceForm } from './AddSourceForm'
import { ErrorBanner } from './ErrorBanner'
import { SourceItem } from './SourceItem'

export function SourcesView() {
  const { sourcesResource, actionErrorMessage, toggleSourceEnabled, removeSource, addSource } = useSources()

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sources</h1>
        <AddSourceForm onAddSource={addSource} />
        {actionErrorMessage && <ErrorBanner message={actionErrorMessage} />}
        {renderSources()}
      </div>
    </div>
  )
}
