import { useState } from 'react'
import type { Source } from '@shared/contract'
import { formatAbsoluteDate, formatRelativeDate } from '@renderer/lib/formatDate'
import { SOURCE_CATEGORY_LABELS } from '@renderer/lib/labels'
import { resolveSourceHealth, type SourceHealthStatus } from '@renderer/lib/sourceHealth'
import { ToggleSwitch } from './ToggleSwitch'

const HEALTH_DOT_CLASS_NAMES: Record<SourceHealthStatus, string> = {
  healthy: 'bg-emerald-500',
  silent: 'bg-amber-500',
  failing: 'bg-red-500',
  pending: 'bg-slate-400 dark:bg-slate-500',
  disabled: 'bg-slate-400 dark:bg-slate-500'
}

const HEALTH_TEXT_CLASS_NAMES: Record<SourceHealthStatus, string> = {
  healthy: 'text-slate-500 dark:text-slate-400',
  silent: 'text-amber-800 dark:text-amber-200',
  failing: 'text-red-800 dark:text-red-200',
  pending: 'text-slate-500 dark:text-slate-400',
  disabled: 'text-slate-500 dark:text-slate-400'
}

interface SourceItemProps {
  source: Source
  onToggleEnabled: (source: Source) => void
  onRemove: (source: Source) => Promise<void>
}

export function SourceItem({ source, onToggleEnabled, onRemove }: SourceItemProps) {
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const sourceHealth = resolveSourceHealth(source, new Date())

  const confirmRemoval = async (): Promise<void> => {
    setIsRemoving(true)
    await onRemove(source)
    setIsRemoving(false)
    setIsConfirmingRemoval(false)
  }

  return (
    <li className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{source.name}</span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              {SOURCE_CATEGORY_LABELS[source.category]}
            </span>
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400" title={source.feedUrl}>
            {source.feedUrl}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {source.lastFetchedAt ? (
              <>
                Dernière collecte :{' '}
                <time dateTime={source.lastFetchedAt} title={formatAbsoluteDate(source.lastFetchedAt)}>
                  {formatRelativeDate(source.lastFetchedAt)}
                </time>
              </>
            ) : (
              'Jamais collectée'
            )}
          </p>
          <p className={`mt-1 flex items-start gap-2 text-xs ${HEALTH_TEXT_CLASS_NAMES[sourceHealth.status]}`}>
            <span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${HEALTH_DOT_CLASS_NAMES[sourceHealth.status]}`} />
            <span>{sourceHealth.label}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ToggleSwitch
            isChecked={source.isEnabled}
            label={source.isEnabled ? `Désactiver la source ${source.name}` : `Activer la source ${source.name}`}
            onChange={() => onToggleEnabled(source)}
          />
          {!isConfirmingRemoval && (
            <button
              type="button"
              onClick={() => setIsConfirmingRemoval(true)}
              aria-label={`Supprimer la source ${source.name}`}
              title="Supprimer"
              className="rounded-md px-2 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
      {isConfirmingRemoval && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-900 dark:text-red-100">
          <span>Supprimer cette source ?</span>
          <button
            type="button"
            disabled={isRemoving}
            onClick={confirmRemoval}
            className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isRemoving ? 'Suppression…' : 'Confirmer la suppression'}
          </button>
          <button
            type="button"
            disabled={isRemoving}
            onClick={() => setIsConfirmingRemoval(false)}
            className="rounded-md px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-60"
          >
            Annuler
          </button>
        </div>
      )}
    </li>
  )
}
