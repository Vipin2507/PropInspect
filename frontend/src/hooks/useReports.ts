import { useEffect, useState } from 'react'
import { reportsApi } from '../utils/api'
import type { DashboardData } from '../types'

export function useReportsOverview() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportsApi.overview().then(({ data }) => setData(data)).finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
