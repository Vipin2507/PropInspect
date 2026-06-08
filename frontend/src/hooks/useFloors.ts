import { useEffect, useState } from 'react'
import { floorsApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { Floor } from '../types'

export function useFloors(towerId: string | null) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(!!towerId)

  useEffect(() => {
    if (!towerId) { setFloors([]); setLoading(false); return }

    ;(async () => {
      // 1. Cache first
      try {
        const db = await getDb()
        const cached = (await db.getAllFromIndex('floors', 'by-tower', towerId)) as unknown as Floor[]
        if (cached.length > 0) { setFloors(cached); setLoading(false) }
      } catch { /* ignore */ }

      // 2. Network refresh
      try {
        const { data } = await floorsApi.list(towerId)
        const db = await getDb()
        const tx = db.transaction('floors', 'readwrite')
        for (const f of data) await tx.store.put(f as unknown as Record<string, unknown>)
        await tx.done
        setFloors(data)
      } catch { /* keep cached */ }
      finally { setLoading(false) }
    })()
  }, [towerId])

  return { floors, loading }
}
