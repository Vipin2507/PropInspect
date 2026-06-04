import { useEffect, useState } from 'react'
import { towersApi } from '../utils/api'
import type { Tower } from '../types'

export function useTowers(projectId: string | null) {
  const [towers, setTowers] = useState<Tower[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    towersApi.list(projectId).then(({ data }) => setTowers(data)).finally(() => setLoading(false))
  }, [projectId])

  return { towers, loading }
}
