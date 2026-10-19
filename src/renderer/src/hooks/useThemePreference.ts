import { useState } from 'react'
import type { ThemePreference } from '@shared/contract'
import { describeError } from '@renderer/lib/describeError'
import { useAsyncResource } from './useAsyncResource'

export function useThemePreference() {
  const themePreferenceResource = useAsyncResource(() => window.devflux.getThemePreference(), 'theme-preference')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateErrorMessage, setUpdateErrorMessage] = useState<string | null>(null)
  const { updateValue: updateThemePreference } = themePreferenceResource

  const setThemePreference = async (themePreference: ThemePreference): Promise<void> => {
    setIsUpdating(true)
    setUpdateErrorMessage(null)
    try {
      const savedThemePreference = await window.devflux.setThemePreference(themePreference)
      updateThemePreference(() => savedThemePreference)
    } catch (error) {
      setUpdateErrorMessage(`Impossible de modifier le thème. (${describeError(error)})`)
    } finally {
      setIsUpdating(false)
    }
  }

  return { themePreferenceResource, isUpdating, updateErrorMessage, setThemePreference }
}
