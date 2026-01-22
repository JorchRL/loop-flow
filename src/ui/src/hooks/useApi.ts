import { useState, useEffect, useCallback } from 'react'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcher()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
