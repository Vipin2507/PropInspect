import { useEffect, useState } from 'react'
import { reportsApi } from '../utils/api'
import type { DashboardData } from '../types'

const CACHE_KEY = 'reports_overview_cache'

export function useReportsOverview() {
  // Initialise synchronously — dashboard renders from cache with zero delay
  const [data, setData] = useState<DashboardData | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      return cached ? (JSON.parse(cached) as DashboardData) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(!localStorage.getItem(CACHE_KEY))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    reportsApi.overview()
      .then(({ data: fresh }) => {
        localStorage.setItem(CACHE_KEY, JSON.stringify(fresh))
        setData(fresh)
        setError(null)
      })
      .catch(() => {
        if (!data) setError('No data available offline')
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error }
}
