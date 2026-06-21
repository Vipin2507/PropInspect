import { useEffect, useState, useCallback } from 'react'
import { reportsApi } from '../utils/api'
import type { ActivityEntry } from '../types'

export function useActivity(limit = 100) {
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data } = await reportsApi.activity(limit)
      setActivity(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { refresh() }, [refresh])

  return { activity, loading, refresh }
}
