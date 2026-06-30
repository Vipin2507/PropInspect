import { useCallback, useEffect, useState } from 'react'
import { qaChangesApi } from '../utils/api'
import type { FlatChangeGroup } from '../types'
import { useAuthStore } from '../store/authStore'

interface QaChangesFilters {
  projectId?: string
  towerId?: string
  flatId?: string
  unreviewedOnly?: boolean
}

export function useQaChanges(filters: QaChangesFilters = {}) {
  const [groups, setGroups] = useState<FlatChangeGroup[]>([])
  const [totalUnreviewed, setTotalUnreviewed] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await qaChangesApi.list({
        projectId: filters.projectId,
        towerId: filters.towerId,
        flatId: filters.flatId,
        unreviewedOnly: filters.unreviewedOnly ?? true,
      })
      setGroups(data.groups)
      setTotalUnreviewed(data.totalUnreviewed)
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false)
    }
  }, [filters.projectId, filters.towerId, filters.flatId, filters.unreviewedOnly])

  useEffect(() => {
    load()
  }, [load])

  const markChangeReviewed = useCallback(
    async (changeId: string) => {
      await qaChangesApi.markReviewed(changeId)
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
    },
    []
  )

  const markFlatReviewed = useCallback(async (flatId: string) => {
    const { data } = await qaChangesApi.markFlatReviewed(flatId)
    setGroups((prev) => prev.filter((g) => g.flatId !== flatId))
    setTotalUnreviewed((n) => Math.max(0, n - data.markedCount))
    return data.markedCount
  }, [])

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
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (role !== 'qa' && role !== 'admin') return
    try {
      const { data } = await qaChangesApi.count()
      setCount(data.unreviewed)
    } catch {
      /* ignore */
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
