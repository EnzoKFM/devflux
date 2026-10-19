import { useState } from 'react'
import { describeError } from '@renderer/lib/describeError'
import { useAsyncResource } from './useAsyncResource'

export function useAutostart() {
  const autostartResource = useAsyncResource(() => window.devflux.getAutostartStatus(), 'autostart')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateErrorMessage, setUpdateErrorMessage] = useState<string | null>(null)
  const { updateValue: updateAutostartStatus } = autostartResource

  const setAutostartEnabled = async (isEnabled: boolean): Promise<void> => {
    setIsUpdating(true)
    setUpdateErrorMessage(null)
    try {
      const updatedStatus = await window.devflux.setAutostartEnabled(isEnabled)
      updateAutostartStatus(() => updatedStatus)
    } catch (error) {
      setUpdateErrorMessage(`Impossible de modifier le réglage. (${describeError(error)})`)
    } finally {
      setIsUpdating(false)
    }
  }

  return { autostartResource, isUpdating, updateErrorMessage, setAutostartEnabled }
}
