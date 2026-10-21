import { useCallback, useEffect, useState, type DependencyList } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useAsyncResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): AsyncState<T> & { reload: () => void; setData: (data: T | null) => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((previous) => ({ ...previous, loading: true, error: null }))

    loader(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const normalized = error instanceof Error ? error : new Error('Falha inesperada.')
        setState({ data: null, loading: false, error: normalized })
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  const setData = useCallback((data: T | null) => {
    setState((previous) => ({ ...previous, data }))
  }, [])

  return { ...state, reload, setData }
}
