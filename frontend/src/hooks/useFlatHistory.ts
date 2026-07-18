import { useEffect, useState, useCallback } from 'react'
import { flatsApi } from '../utils/api'
import { readLsCache, writeLsCache } from '../utils/offlineCache'
import type { FlatHistoryEntry } from '../types'

function historyCacheKey(flatId: string) {
  return `flat_history_${flatId}`
}

export function useFlatHistory(flatId: string | undefined) {
  const [history, setHistory] = useState<FlatHistoryEntry[]>(() =>
    flatId ? (readLsCache<FlatHistoryEntry[]>(historyCacheKey(flatId)) ?? []) : []
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!flatId) return
    setLoading(true)
    setError(null)

    const cached = readLsCache<FlatHistoryEntry[]>(historyCacheKey(flatId))
    if (cached?.length) {
      setHistory(cached)
      setLoading(false)
    }

    try {
      const { data } = await flatsApi.history(flatId)
      writeLsCache(historyCacheKey(flatId), data)
      setHistory(data)
      setError(null)
    } catch (err: unknown) {
      if (!cached?.length) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to load history'
        setError(msg)
        setHistory([])
      }
    } finally {
      setLoading(false)
    }
  }, [flatId])

  useEffect(() => {
    load()
  }, [load])

  return { history, loading, error, refresh: load }
}
