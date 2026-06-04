import { useEffect, useState, useCallback } from 'react'
import { towersApi } from '../utils/api'
import type { Tower } from '../types'

export function useTowers(projectId: string | null) {
  const [towers, setTowers] = useState<Tower[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    towersApi.list(projectId).then(({ data }) => setTowers(data)).finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { towers, loading, refresh }
}
