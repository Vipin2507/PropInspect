import { useEffect, useState } from 'react'
import { snagsApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { Snag } from '../types'

export function useSnags(params: { flatId?: string; projectId?: string; inspectionId?: string }) {
  const [snags, setSnags] = useState<Snag[]>([])
  const [loading, setLoading] = useState(true)

  const { flatId, projectId, inspectionId } = params

  useEffect(() => {
    if (!flatId && !projectId && !inspectionId) { setSnags([]); setLoading(false); return }
    setLoading(true)
    ;(async () => {
      try {
        const db = await getDb()
        // Read from cache first
        let cached: Snag[] = []
        if (flatId) cached = (await db.getAllFromIndex('snags', 'by-flat', flatId)) as unknown as Snag[]
        else if (inspectionId) cached = (await db.getAllFromIndex('snags', 'by-inspection', inspectionId)) as unknown as Snag[]
        else cached = (await db.getAll('snags')) as unknown as Snag[]
        if (cached.length > 0) { setSnags(cached); setLoading(false) }

        const { data } = await snagsApi.list({ flatId, projectId, inspectionId })
        if (data.length > 0) {
          const tx = db.transaction('snags', 'readwrite')
          for (const s of data) await tx.store.put(s as unknown as Record<string, unknown>)
          await tx.done
        }
        setSnags(data)
      } catch { /* keep cached */ }
      finally { setLoading(false) }
    })()
  }, [flatId, projectId, inspectionId])

  return { snags, loading, setSnags }
}
