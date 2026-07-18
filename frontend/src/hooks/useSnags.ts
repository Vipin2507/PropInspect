import { useEffect, useState, useRef } from 'react'
import { snagsApi } from '../utils/api'
import { getDb } from '../utils/db'
import { cacheSnagImages } from '../utils/imageCache'
import type { Snag } from '../types'

// Module-level memory cache keyed by query string
const memCache: Map<string, Snag[]> = new Map()

function cacheKey(params: { flatId?: string; projectId?: string; inspectionId?: string }) {
  return `${params.flatId ?? ''}|${params.projectId ?? ''}|${params.inspectionId ?? ''}`
}

export function useSnags(params: { flatId?: string; projectId?: string; inspectionId?: string }) {
  const { flatId, projectId, inspectionId } = params
  const key = cacheKey(params)
  const initial = memCache.get(key) ?? []

  const [snags, setSnags] = useState<Snag[]>(initial)
  const [loading, setLoading] = useState(initial.length === 0 && !!(flatId || projectId || inspectionId))
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [flatId, projectId, inspectionId])

  useEffect(() => {
    if (!flatId && !projectId && !inspectionId) { setSnags([]); setLoading(false); return }

    ;(async () => {
      // Phase 1: IndexedDB if memory empty
      if (!memCache.has(key)) {
        try {
          const db = await getDb()
          let cached: Snag[] = []
          if (flatId) cached = (await db.getAllFromIndex('snags', 'by-flat', flatId)) as unknown as Snag[]
          else if (inspectionId) cached = (await db.getAllFromIndex('snags', 'by-inspection', inspectionId)) as unknown as Snag[]
          else cached = (await db.getAll('snags')) as unknown as Snag[]
          if (cached.length > 0) {
            memCache.set(key, cached)
            if (mounted.current) { setSnags(cached); setLoading(false) }
          }
        } catch { /* ignore */ }
      }

      // Phase 2: Network
      try {
        const { data } = await snagsApi.list({ flatId, projectId, inspectionId })
        memCache.set(key, data)
        if (data.length > 0) {
          const db = await getDb()
          const tx = db.transaction('snags', 'readwrite')
          for (const s of data) {
            await tx.store.put(s as unknown as Record<string, unknown>)
            cacheSnagImages(s)
          }
          await tx.done
        }
        if (mounted.current) setSnags(data)
      } catch { /* keep cached */ }
      finally { if (mounted.current) setLoading(false) }
    })()
  }, [flatId, projectId, inspectionId, key])

  return { snags, loading, setSnags }
}
