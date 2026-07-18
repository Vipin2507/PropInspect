import { useEffect, useState, useCallback } from 'react'
import { reportsApi } from '../utils/api'
import { readLsCache, writeLsCache, cacheKey } from '../utils/offlineCache'
import type { ActivityEntry } from '../types'

const CACHE_PREFIX = 'activity_log'

export function useActivity(limit = 100) {
  const key = cacheKey(CACHE_PREFIX, { limit: String(limit) })
  const [activity, setActivity] = useState<ActivityEntry[]>(() =>
    readLsCache<ActivityEntry[]>(key) ?? []
  )
  const [loading, setLoading] = useState(!readLsCache(key))

  const refresh = useCallback(async () => {
    const cached = readLsCache<ActivityEntry[]>(key)
    if (cached?.length) {
      setActivity(cached)
      setLoading(false)
    }

    try {
      const { data } = await reportsApi.activity(limit)
      writeLsCache(key, data)
      setActivity(data)
    } catch {
      // keep cached
    } finally {
      setLoading(false)
    }
  }, [limit, key])

  useEffect(() => { refresh() }, [refresh])

  return { activity, loading, refresh }
}
