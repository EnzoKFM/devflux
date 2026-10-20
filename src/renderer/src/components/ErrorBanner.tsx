interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-800 dark:text-red-200"
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer le message d’erreur"
          title="Fermer"
          className="shrink-0 rounded px-1 font-semibold hover:bg-red-100 dark:hover:bg-red-900"
        >
          ✕
        </button>
      )}
    </div>
  )
}
