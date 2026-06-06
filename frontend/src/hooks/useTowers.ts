import { useEffect, useState, useCallback } from 'react'
import { towersApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { Tower } from '../types'

export function useTowers(projectId: string | null) {
  const [towers, setTowers] = useState<Tower[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!projectId) { setTowers([]); return }
    setLoading(true)

    try {
      const db = await getDb()
      const cached = (await db.getAllFromIndex('towers', 'by-project', projectId)) as unknown as Tower[]
      if (cached.length > 0) {
        setTowers(cached)
        setLoading(false)
      }
      const { data } = await towersApi.list(projectId)
      const tx = db.transaction('towers', 'readwrite')
      for (const t of data) await tx.store.put(t as unknown as Record<string, unknown>)
      await tx.done
      setTowers(data)
    } catch {
      // Keep cached or empty
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { refresh() }, [refresh])

  return { towers, loading, refresh }
}
