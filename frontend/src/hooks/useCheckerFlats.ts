import { useEffect, useState, useCallback } from 'react'
import { flatsApi } from '../utils/api'
import type { Flat } from '../types'

const CACHE_KEY = 'checker_flats_cache'

interface CheckerFlatsFilters {
  projectId?: string
  towerId?: string
  search?: string
}

/**
 * Req 5 — Fetches the Checker flat progress listing.
 * Only returns flats in submitted/approved/rejected/revision_required/desnagging status.
 * Results are cached in localStorage for offline use.
 */
export function useCheckerFlats(filters: CheckerFlatsFilters = {}) {
  const [flats, setFlats] = useState<Flat[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(!localStorage.getItem(CACHE_KEY))

  const load = useCallback(async () => {
    try {
      const { data } = await flatsApi.checkerList({
        projectId: filters.projectId,
        towerId: filters.towerId,
      })
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      setFlats(data)
    } catch {
      // Network unavailable — stay with cached
    } finally {
      setLoading(false)
    }
  }, [filters.projectId, filters.towerId])

  useEffect(() => {
    load()
  }, [load])

  // Client-side search filter
  const filtered = filters.search
    ? flats.filter((f) => {
        const q = filters.search!.toLowerCase()
        return (
          f.flatNumber?.toLowerCase().includes(q) ||
          f.towerName?.toLowerCase().includes(q) ||
          f.engineerName?.toLowerCase().includes(q)
        )
      })
    : flats

  return { flats: filtered, loading, reload: load }
}
