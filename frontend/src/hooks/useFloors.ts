import { useEffect, useState } from 'react'
import { floorsApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { Floor } from '../types'

export function useFloors(towerId: string | null) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!towerId) { setFloors([]); return }
    setLoading(true)
    ;(async () => {
      try {
        const db = await getDb()
        const cached = (await db.getAllFromIndex('floors', 'by-tower', towerId)) as unknown as Floor[]
        if (cached.length > 0) { setFloors(cached); setLoading(false) }
        const { data } = await floorsApi.list(towerId)
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
