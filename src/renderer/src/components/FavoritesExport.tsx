import { useState } from 'react'
import { describeError } from '@renderer/lib/describeError'
import { ErrorBanner } from './ErrorBanner'

export function FavoritesExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [isExportConfirmed, setIsExportConfirmed] = useState(false)
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null)

  const exportFavorites = async (): Promise<void> => {
    setIsExporting(true)
    setIsExportConfirmed(false)
    setExportErrorMessage(null)
    try {
      setIsExportConfirmed(await window.devflux.exportFavoritesMarkdown())
    } catch (error) {
      setExportErrorMessage(`Impossible d’exporter les favoris. ${describeError(error)}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void exportFavorites()}
          disabled={isExporting}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
        >
          Exporter en Markdown
        </button>
        {isExportConfirmed && (
          <p role="status" className="text-xs text-slate-500 dark:text-slate-400">
            Favoris exportés.
          </p>
        )}
      </div>
      {exportErrorMessage && <ErrorBanner message={exportErrorMessage} onDismiss={() => setExportErrorMessage(null)} />}
    </div>
  )
}
