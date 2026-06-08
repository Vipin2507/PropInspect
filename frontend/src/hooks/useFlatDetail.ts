/**
 * useFlatDetail — loads a single flat with full offline support.
 *
 * Priority order:
 * 1. useFlats memory cache (already populated if user came from flat list — instant)
 * 2. IndexedDB (populated by prefetch — fast)
 * 3. Network (always refreshes in background)
 */

import { useEffect, useState } from 'react'
import { flatsApi } from '../utils/api'
import { getDb } from '../utils/db'
import { saveSingleFlat, getFlatById } from '../utils/storage'
import type { Flat } from '../types'

export function useFlatDetail(flatId: string | undefined): Flat | null {
  const [flat, setFlat] = useState<Flat | null>(null)

  useEffect(() => {
    if (!flatId) return

    ;(async () => {
      // 1. IndexedDB cache first — shows flat number immediately offline
      const cached = await getFlatById(flatId).catch(() => undefined)
      if (cached) setFlat(cached)

      // 2. Network refresh in background
      try {
        const { data } = await flatsApi.get(flatId)
        await saveSingleFlat(data)
        setFlat(data)
      } catch {
        // Stay with cached flat — already set above
      }
    })()
  }, [flatId])

  return flat
}
