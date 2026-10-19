import type { PreparationProgress } from '@shared/contract'
import { describePreparation } from '@renderer/lib/preparationProgress'

interface PreparationScreenProps {
  progress: PreparationProgress | null
  errorMessage: string | null
  onRetry: () => void
}

export function PreparationScreen({ progress, errorMessage, onRetry }: PreparationScreenProps) {
  const { label, percentage } = describePreparation(progress)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">DevFlux</h1>
      {errorMessage === null ? (
        <div className="w-full max-w-md" role="status" aria-live="polite">
          <p className="mb-3 text-center text-sm text-slate-600">{label}</p>
          <div
            role="progressbar"
            aria-label="Préparation du fil du jour"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center gap-4" role="alert">
          <p className="text-center text-sm text-red-700">
            La préparation du fil du jour a échoué. {errorMessage}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  )
}
