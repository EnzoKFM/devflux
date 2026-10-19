import { useState } from 'react'
import type { ProfileTopic } from '@shared/contract'
import { pluralize } from '@renderer/lib/pluralize'
import { ErrorBanner } from './ErrorBanner'

interface OnboardingScreenProps {
  topics: ProfileTopic[]
  isSubmitting: boolean
  errorMessage: string | null
  onSubmit: (followedTopicIds: string[]) => void
}

export function OnboardingScreen({ topics, isSubmitting, errorMessage, onSubmit }: OnboardingScreenProps) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])

  const toggleTopic = (topicId: string): void => {
    setSelectedTopicIds((currentTopicIds) =>
      currentTopicIds.includes(topicId)
        ? currentTopicIds.filter((currentTopicId) => currentTopicId !== topicId)
        : [...currentTopicIds, topicId]
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-6 px-6 py-10">
        <header className="text-center">
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">DevFlux</p>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Qu’est-ce qui vous intéresse ?</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Choisissez les sujets à suivre pour personnaliser votre fil dès le premier jour. Vous pourrez les modifier à
            tout moment dans « Mon profil ».
          </p>
        </header>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {topics.map((topic) => {
            const isSelected = selectedTopicIds.includes(topic.id)
            return (
              <li key={topic.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  disabled={isSubmitting}
                  onClick={() => toggleTopic(topic.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {topic.label}
                </button>
              </li>
            )
          })}
        </ul>
        <p role="status" aria-live="polite" className="text-center text-sm text-slate-600 dark:text-slate-400">
          {selectedTopicIds.length === 0
            ? 'Aucun sujet sélectionné'
            : `${pluralize(selectedTopicIds.length, 'sujet sélectionné', 'sujets sélectionnés')}`}
        </p>
        {errorMessage && <ErrorBanner message={errorMessage} />}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onSubmit([])}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            Passer
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onSubmit(selectedTopicIds)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Enregistrement…' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
