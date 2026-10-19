import { useCallback, useEffect, useState } from 'react'
import type { PreparationProgress } from '@shared/contract'
import { useAsyncResource } from './useAsyncResource'

export function useDailyDigest() {
  const digestResource = useAsyncResource(() => window.devflux.prepareDailyDigest(), 'daily-digest')
  const [preparationProgress, setPreparationProgress] = useState<PreparationProgress | null>(null)
  const { reload: reloadDigest } = digestResource

  useEffect(() => window.devflux.onPreparationProgress(setPreparationProgress), [])

  const retryPreparation = useCallback(() => {
    setPreparationProgress(null)
    reloadDigest()
  }, [reloadDigest])

  return { digestResource, preparationProgress, retryPreparation }
}
