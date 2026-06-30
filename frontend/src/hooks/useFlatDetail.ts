import { useEffect, useState } from 'react'
import { flatsApi } from '../utils/api'
import { saveSingleFlat, getFlatById } from '../utils/storage'
import { getFlatFromMemCache } from '../hooks/useFlats'
import type { Flat } from '../types'

export function useFlatDetail(flatId: string | undefined): Flat | null {
  const [flat, setFlat] = useState<Flat | null>(() =>
    flatId ? getFlatFromMemCache(flatId) ?? null : null
  )

  useEffect(() => {
    if (!flatId) return

    const fromList = getFlatFromMemCache(flatId)
    if (fromList) setFlat(fromList)

    let cancelled = false

    ;(async () => {
      const cached = await getFlatById(flatId).catch(() => undefined)
      if (!cancelled && cached) setFlat(cached)

      try {
        const { data } = await flatsApi.get(flatId)
        if (!cancelled) {
          await saveSingleFlat(data)
          setFlat(data)
        }
      } catch {
        // Keep list / IndexedDB cache
      }
    })()

    return () => { cancelled = true }
  }, [flatId])

  return flat
}
