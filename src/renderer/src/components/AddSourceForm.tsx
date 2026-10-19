import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { Source, SourceCategory } from '@shared/contract'
import { describeError } from '@renderer/lib/describeError'
import { SOURCE_CATEGORIES, SOURCE_CATEGORY_LABELS } from '@renderer/lib/labels'
import { ErrorBanner } from './ErrorBanner'

interface AddSourceFormProps {
  onAddSource: (feedUrl: string, category: SourceCategory) => Promise<Source>
}

export function AddSourceForm({ onAddSource }: AddSourceFormProps) {
  const [feedUrl, setFeedUrl] = useState('')
  const [category, setCategory] = useState<SourceCategory>('web')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const trimmedFeedUrl = feedUrl.trim()

  const submitSource = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (trimmedFeedUrl.length === 0 || isSubmitting) {
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await onAddSource(trimmedFeedUrl, category)
      setFeedUrl('')
    } catch (error) {
      setErrorMessage(describeError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeCategory = (event: ChangeEvent<HTMLSelectElement>): void => {
    setCategory(event.target.value as SourceCategory)
  }

  return (
    <form onSubmit={submitSource} noValidate className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-900">Ajouter une source</h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm text-slate-700">
          URL du flux ou du site
          <input
            type="url"
            value={feedUrl}
            disabled={isSubmitting}
            onChange={(event) => setFeedUrl(event.target.value)}
            placeholder="https://exemple.com/feed.xml"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Catégorie
          <select
            value={category}
            disabled={isSubmitting}
            onChange={changeCategory}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
          >
            {SOURCE_CATEGORIES.map((sourceCategory) => (
              <option key={sourceCategory} value={sourceCategory}>
                {SOURCE_CATEGORY_LABELS[sourceCategory]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={isSubmitting || trimmedFeedUrl.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Ajout…' : 'Ajouter'}
        </button>
      </div>
      {errorMessage && (
        <div className="mt-3">
          <ErrorBanner message={errorMessage} />
        </div>
      )}
    </form>
  )
}
