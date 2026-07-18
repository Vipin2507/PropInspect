import { useCallback, useEffect, useState } from 'react'
import { qaChangesApi } from '../utils/api'
import { cacheKey, readLsCache, writeLsCache } from '../utils/offlineCache'
import type { FlatChangeGroup } from '../types'
import { useAuthStore } from '../store/authStore'

interface QaChangesFilters {
  projectId?: string
  towerId?: string
  flatId?: string
  unreviewedOnly?: boolean
}

const LIST_PREFIX = 'qa_changes'
const COUNT_KEY = 'qa_changes_count'

export function useQaChanges(filters: QaChangesFilters = {}) {
  const listKey = cacheKey(LIST_PREFIX, {
    projectId: filters.projectId,
    towerId: filters.towerId,
    flatId: filters.flatId,
    unreviewedOnly: filters.unreviewedOnly ?? true,
  })

  const [groups, setGroups] = useState<FlatChangeGroup[]>(() =>
    readLsCache<FlatChangeGroup[]>(listKey) ?? []
  )
  const [totalUnreviewed, setTotalUnreviewed] = useState(() =>
    readLsCache<{ totalUnreviewed: number }>(`${listKey}:meta`)?.totalUnreviewed ?? 0
  )
  const [loading, setLoading] = useState(!readLsCache(listKey))

  const load = useCallback(async () => {
    setLoading(true)

    const cached = readLsCache<FlatChangeGroup[]>(listKey)
    if (cached) {
      setGroups(cached)
      const meta = readLsCache<{ totalUnreviewed: number }>(`${listKey}:meta`)
      if (meta) setTotalUnreviewed(meta.totalUnreviewed)
      setLoading(false)
    }

    try {
      const { data } = await qaChangesApi.list({
        projectId: filters.projectId,
        towerId: filters.towerId,
        flatId: filters.flatId,
        unreviewedOnly: filters.unreviewedOnly ?? true,
      })
      writeLsCache(listKey, data.groups)
      writeLsCache(`${listKey}:meta`, { totalUnreviewed: data.totalUnreviewed })
      writeLsCache(COUNT_KEY, { unreviewed: data.totalUnreviewed })
      setGroups(data.groups)
      setTotalUnreviewed(data.totalUnreviewed)
    } catch {
      // keep cached data
    } finally {
      setLoading(false)
    }
  }, [filters.projectId, filters.towerId, filters.flatId, filters.unreviewedOnly, listKey])

  useEffect(() => {
    load()
  }, [load])

  const markChangeReviewed = useCallback(
    async (changeId: string) => {
      setGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            changes: g.changes.filter((c) => c.id !== changeId),
            unreviewedCount: g.changes.filter((c) => c.id !== changeId && !c.reviewedAt).length,
          }))
          .filter((g) => g.changes.length > 0)
      )
      setTotalUnreviewed((n) => Math.max(0, n - 1))
      try {
        await qaChangesApi.markReviewed(changeId)
      } catch { /* optimistic update kept */ }
    },
    []
  )

  const markFlatReviewed = useCallback(async (flatId: string) => {
    const removed = groups.find((g) => g.flatId === flatId)?.unreviewedCount ?? 0
    setGroups((prev) => prev.filter((g) => g.flatId !== flatId))
    setTotalUnreviewed((n) => Math.max(0, n - removed))
    try {
      const { data } = await qaChangesApi.markFlatReviewed(flatId)
      setTotalUnreviewed((n) => Math.max(0, n - data.markedCount))
      return data.markedCount
    } catch {
      return removed
    }
  }, [groups])

  return {
    groups,
    totalUnreviewed,
    loading,
    reload: load,
    markChangeReviewed,
    markFlatReviewed,
  }
}

export function useQaChangesCount() {
  const role = useAuthStore((s) => s.user?.role)
  const [count, setCount] = useState(() =>
    readLsCache<{ unreviewed: number }>(COUNT_KEY)?.unreviewed ?? 0
  )

  const load = useCallback(async () => {
    if (role !== 'qa' && role !== 'admin') return
    try {
      const { data } = await qaChangesApi.count()
      writeLsCache(COUNT_KEY, { unreviewed: data.unreviewed })
      setCount(data.unreviewed)
    } catch {
      const cached = readLsCache<{ unreviewed: number }>(COUNT_KEY)
      if (cached) setCount(cached.unreviewed)
    }
  }, [role])

  useEffect(() => {
    if (role !== 'qa' && role !== 'admin') return
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load, role])

  return { count, reload: load }
}
