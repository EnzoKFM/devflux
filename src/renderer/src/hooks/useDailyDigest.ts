import { useCallback, useEffect, useRef, useState } from 'react'
import type { PreparationProgress } from '@shared/contract'
import { useAsyncResource } from './useAsyncResource'

export function useDailyDigest() {
  const isRefreshRequestedRef = useRef(false)
  const digestResource = useAsyncResource(
    () => (isRefreshRequestedRef.current ? window.devflux.refreshDailyDigest() : window.devflux.prepareDailyDigest()),
    'daily-digest'
  )
  const [preparationProgress, setPreparationProgress] = useState<PreparationProgress | null>(null)
  const { reload: reloadDigest } = digestResource

  useEffect(() => window.devflux.onPreparationProgress(setPreparationProgress), [])

  const retryPreparation = useCallback(() => {
    setPreparationProgress(null)
    reloadDigest()
  }, [reloadDigest])

  const refreshDigest = useCallback(() => {
    isRefreshRequestedRef.current = true
    setPreparationProgress(null)
    reloadDigest()
  }, [reloadDigest])

  return { digestResource, preparationProgress, retryPreparation, refreshDigest }
}
