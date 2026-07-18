import { useEffect, useState, useCallback } from 'react'
import { flatsApi, reviewsApi } from '../utils/api'
import { cacheKey, readLsCache, writeLsCache } from '../utils/offlineCache'
import { saveInspection } from '../utils/storage'
import { cacheReviewDetailImages } from '../utils/imageCache'
import type { Flat, Inspection } from '../types'

const CACHE_PREFIX = 'checker_flats_cache'

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
  const listKey = cacheKey(CACHE_PREFIX, {
    projectId: filters.projectId,
    towerId: filters.towerId,
  })

  const [flats, setFlats] = useState<Flat[]>(() =>
    readLsCache<Flat[]>(listKey) ?? readLsCache<Flat[]>(CACHE_PREFIX) ?? []
  )
  const [loading, setLoading] = useState(!readLsCache(listKey) && !readLsCache(CACHE_PREFIX))

  const load = useCallback(async () => {
    try {
      const { data } = await flatsApi.checkerList({
        projectId: filters.projectId,
        towerId: filters.towerId,
      })
      writeLsCache(listKey, data)
      writeLsCache(CACHE_PREFIX, data)
      setFlats(data)

      // Quietly cache review details for offline while online on All Flats
      void Promise.allSettled(
        data
          .filter((f) =>
            ['submitted', 'revision_required', 'approved', 'rejected', 'desnagging'].includes(f.status)
          )
          .map(async (flat) => {
            const inspectionId = flat.inspectionId || flat.inspection?.id
            if (!inspectionId) return
            const cacheKeyDetail = `review_detail_${inspectionId}`
            if (readLsCache(cacheKeyDetail)) return
            try {
              const { data: detail } = await reviewsApi.get(inspectionId)
              writeLsCache(cacheKeyDetail, detail)
              cacheReviewDetailImages(detail as { inspection: Inspection })
              if (detail.inspection) await saveInspection(detail.inspection)
            } catch { /* ignore */ }
          })
      )
    } catch {
      // Network unavailable — stay with cached
    } finally {
      setLoading(false)
    }
  }, [filters.projectId, filters.towerId, listKey])

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
