import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { describeError } from '@renderer/lib/describeError'

type SettledRequest<Value> =
  | { requestKey: string; status: 'success'; value: Value }
  | { requestKey: string; status: 'error'; errorMessage: string }

export type AsyncResource<Value> =
  | { status: 'loading'; reload: () => void; updateValue: (updateCurrentValue: (currentValue: Value) => Value) => void }
  | {
      status: 'success'
      value: Value
      reload: () => void
      updateValue: (updateCurrentValue: (currentValue: Value) => Value) => void
    }
  | {
      status: 'error'
      errorMessage: string
      reload: () => void
      updateValue: (updateCurrentValue: (currentValue: Value) => Value) => void
    }

export function useAsyncResource<Value>(load: () => Promise<Value>, resourceKey: string): AsyncResource<Value> {
  const [attemptCount, setAttemptCount] = useState(0)
  const [settledRequest, setSettledRequest] = useState<SettledRequest<Value> | null>(null)
  const requestKey = `${resourceKey}#${attemptCount}`

  const loadValue = useEffectEvent(load)

  useEffect(() => {
    let isCancelled = false
    loadValue().then(
      (value) => {
        if (!isCancelled) {
          setSettledRequest({ requestKey, status: 'success', value })
        }
      },
      (error: unknown) => {
        if (!isCancelled) {
          setSettledRequest({ requestKey, status: 'error', errorMessage: describeError(error) })
        }
      }
    )
    return () => {
      isCancelled = true
    }
  }, [requestKey])

  const reload = useCallback(() => {
    setAttemptCount((currentAttemptCount) => currentAttemptCount + 1)
  }, [])

  const updateValue = useCallback((updateCurrentValue: (currentValue: Value) => Value) => {
    setSettledRequest((currentRequest) =>
      currentRequest?.status === 'success'
        ? { ...currentRequest, value: updateCurrentValue(currentRequest.value) }
        : currentRequest
    )
  }, [])

  if (settledRequest === null || settledRequest.requestKey !== requestKey) {
    return { status: 'loading', reload, updateValue }
  }

  if (settledRequest.status === 'error') {
    return { status: 'error', errorMessage: settledRequest.errorMessage, reload, updateValue }
  }

  return { status: 'success', value: settledRequest.value, reload, updateValue }
}
