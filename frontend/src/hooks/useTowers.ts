import { useEffect, useState, useCallback, useRef } from 'react'
import { towersApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { Tower } from '../types'

const memCache: Map<string, Tower[]> = new Map()

export function useTowers(projectId: string | null) {
  const key = projectId ?? ''
  const initial = key ? (memCache.get(key) ?? []) : []

  const [towers, setTowers] = useState<Tower[]>(initial)
  const [loading, setLoading] = useState(initial.length === 0 && !!projectId)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [projectId])

  const refresh = useCallback(async () => {
    if (!projectId) { setTowers([]); setLoading(false); return }

    if (!memCache.has(key)) {
      try {
        const db = await getDb()
        const cached = (await db.getAllFromIndex('towers', 'by-project', projectId)) as unknown as Tower[]
        if (cached.length > 0) {
          memCache.set(key, cached)
          if (mounted.current) { setTowers(cached); setLoading(false) }
        }
      } catch { /* ignore */ }
    }

    try {
      const { data } = await towersApi.list(projectId)
      const db = await getDb()
      const tx = db.transaction('towers', 'readwrite')
      for (const t of data) await tx.store.put(t as unknown as Record<string, unknown>)
      await tx.done
      memCache.set(key, data)
      if (mounted.current) setTowers(data)
    } catch { /* keep cached */ }
    finally { if (mounted.current) setLoading(false) }
  }, [projectId, key])

  useEffect(() => { refresh() }, [refresh])

  return { towers, loading, refresh }
}
