import { useAutostart } from '@renderer/hooks/useAutostart'
import { ErrorBanner } from './ErrorBanner'
import { ToggleSwitch } from './ToggleSwitch'

export function SettingsView() {
  const { autostartResource, isUpdating, updateErrorMessage, setAutostartEnabled } = useAutostart()

  const renderAutostart = () => {
    if (autostartResource.status === 'loading') {
      return (
        <p role="status" className="text-sm text-slate-500">
          Chargement des réglages…
        </p>
      )
    }

    if (autostartResource.status === 'error') {
      return (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-red-700">Impossible de charger les réglages. {autostartResource.errorMessage}</p>
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
          <p className="font-medium text-slate-900">Lancer DevFlux au démarrage</p>
          {!autostartStatus.isSupported && (
            <p className="mt-0.5 text-sm text-slate-500">Disponible une fois l’application installée</p>
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
        <h1 className="text-2xl font-bold text-slate-900">Réglages</h1>
        <section className="rounded-lg border border-slate-200 bg-white p-4">{renderAutostart()}</section>
        {updateErrorMessage && <ErrorBanner message={updateErrorMessage} />}
      </div>
    </div>
  )
}
