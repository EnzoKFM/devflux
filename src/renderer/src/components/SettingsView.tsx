import { THEME_PREFERENCES } from '@shared/contract'
import { useAutostart } from '@renderer/hooks/useAutostart'
import { useThemePreference } from '@renderer/hooks/useThemePreference'
import { THEME_PREFERENCE_LABELS } from '@renderer/lib/labels'
import { ErrorBanner } from './ErrorBanner'
import { ToggleSwitch } from './ToggleSwitch'

function ThemeSetting() {
  const { themePreferenceResource, isUpdating, updateErrorMessage, setThemePreference } = useThemePreference()

  if (themePreferenceResource.status === 'loading') {
    return (
      <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
        Chargement du thème…
      </p>
    )
  }

  if (themePreferenceResource.status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-sm text-red-700 dark:text-red-300">
          Impossible de charger le thème. {themePreferenceResource.errorMessage}
        </p>
        <button
          type="button"
          onClick={themePreferenceResource.reload}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium text-slate-900 dark:text-slate-100">Thème</p>
        <div
          role="group"
          aria-label="Thème"
          className="inline-flex shrink-0 overflow-hidden rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
        >
          {THEME_PREFERENCES.map((themePreference) => {
            const isSelected = themePreference === themePreferenceResource.value
            return (
              <button
                key={themePreference}
                type="button"
                aria-pressed={isSelected}
                disabled={isUpdating}
                onClick={() => void setThemePreference(themePreference)}
                className={`px-3 py-1 text-sm font-medium transition-colors not-first:border-l not-first:border-slate-300 dark:not-first:border-slate-600 disabled:cursor-not-allowed ${
                  isSelected ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {THEME_PREFERENCE_LABELS[themePreference]}
              </button>
            )
          })}
        </div>
      </div>
      {updateErrorMessage && <ErrorBanner message={updateErrorMessage} />}
    </div>
  )
}

export function SettingsView() {
  const { autostartResource, isUpdating, updateErrorMessage, setAutostartEnabled } = useAutostart()

  const renderAutostart = () => {
    if (autostartResource.status === 'loading') {
      return (
        <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
          Chargement des réglages…
        </p>
      )
    }

    if (autostartResource.status === 'error') {
      return (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-red-700 dark:text-red-300">Impossible de charger les réglages. {autostartResource.errorMessage}</p>
          <button
            type="button"
            onClick={autostartResource.reload}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Réessayer
          </button>
        </div>
      )
    }

    const autostartStatus = autostartResource.value

    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Lancer DevFlux au démarrage</p>
          {!autostartStatus.isSupported && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Disponible une fois l’application installée</p>
          )}
        </div>
        <ToggleSwitch
          isChecked={autostartStatus.isEnabled}
          isDisabled={!autostartStatus.isSupported || isUpdating}
          label="Lancer DevFlux au démarrage"
          onChange={setAutostartEnabled}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Réglages</h1>
        <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">{renderAutostart()}</section>
        {updateErrorMessage && <ErrorBanner message={updateErrorMessage} />}
        <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <ThemeSetting />
        </section>
      </div>
    </div>
  )
}
