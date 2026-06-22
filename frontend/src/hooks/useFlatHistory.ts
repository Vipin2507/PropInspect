import { useEffect, useState, useCallback } from 'react'
import { flatsApi } from '../utils/api'
import type { FlatHistoryEntry } from '../types'

export function useFlatHistory(flatId: string | undefined) {
  const [history, setHistory] = useState<FlatHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!flatId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await flatsApi.history(flatId)
      setHistory(data)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to load history'
      setError(msg)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [flatId])

  useEffect(() => {
    load()
  }, [load])

  return { history, loading, error, refresh: load }
}
