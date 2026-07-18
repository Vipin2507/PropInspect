import { useCallback, useEffect, useState } from 'react'
import { engineerFeedbackApi } from '../utils/api'
import { cacheKey, readLsCache, writeLsCache } from '../utils/offlineCache'
import type { EngineerFeedbackGroup } from '../types'
import { useAuthStore } from '../store/authStore'

const LIST_PREFIX = 'engineer_feedback'
const COUNT_KEY = 'engineer_feedback_count'

export function useEngineerFeedback(filters: { flatId?: string; unseenOnly?: boolean } = {}) {
  const role = useAuthStore((s) => s.user?.role)
  const listKey = cacheKey(LIST_PREFIX, {
    flatId: filters.flatId,
    unseenOnly: filters.unseenOnly ?? true,
  })

  const [groups, setGroups] = useState<EngineerFeedbackGroup[]>(() =>
    readLsCache<EngineerFeedbackGroup[]>(listKey) ?? []
  )
  const [totalUnseen, setTotalUnseen] = useState(() =>
    readLsCache<{ totalUnseen: number }>(`${listKey}:meta`)?.totalUnseen ?? 0
  )
  const [loading, setLoading] = useState(!readLsCache(listKey))
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (role !== 'engineer' && role !== 'admin') return
    setLoading(true)
    setError(null)

    const cached = readLsCache<EngineerFeedbackGroup[]>(listKey)
    if (cached) {
      setGroups(cached)
      const meta = readLsCache<{ totalUnseen: number }>(`${listKey}:meta`)
      if (meta) setTotalUnseen(meta.totalUnseen)
      setLoading(false)
    }

    try {
      const { data } = await engineerFeedbackApi.list({
        flatId: filters.flatId,
        unseenOnly: filters.unseenOnly ?? true,
      })
      writeLsCache(listKey, data.groups)
      writeLsCache(`${listKey}:meta`, { totalUnseen: data.totalUnseen })
      writeLsCache(COUNT_KEY, { unseen: data.totalUnseen })
      setGroups(data.groups)
      setTotalUnseen(data.totalUnseen)
    } catch (err: unknown) {
      if (!cached) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Could not load QA feedback'
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [role, filters.flatId, filters.unseenOnly, listKey])

  useEffect(() => {
    load()
  }, [load])

  const markFlatSeen = useCallback(async (flatId: string) => {
    let removed = 0
    setGroups((prev) => {
      const group = prev.find((g) => g.flatId === flatId)
      removed = group?.unseenCount ?? 0
      return prev.filter((g) => g.flatId !== flatId)
    })
    setTotalUnseen((n) => Math.max(0, n - removed))
    try {
      const { data } = await engineerFeedbackApi.markFlatSeen(flatId)
      setTotalUnseen((n) => Math.max(0, n - data.markedCount))
      return data.markedCount
    } catch {
      return removed
    }
  }, [])

  return { groups, totalUnseen, loading, error, reload: load, markFlatSeen }
}

export function useEngineerFeedbackCount() {
  const role = useAuthStore((s) => s.user?.role)
  const [count, setCount] = useState(() =>
    readLsCache<{ unseen: number }>(COUNT_KEY)?.unseen ?? 0
  )

  const load = useCallback(async () => {
    if (role !== 'engineer' && role !== 'admin') return
    try {
      const { data } = await engineerFeedbackApi.count()
      writeLsCache(COUNT_KEY, { unseen: data.unseen })
      setCount(data.unseen)
    } catch {
      const cached = readLsCache<{ unseen: number }>(COUNT_KEY)
      if (cached) setCount(cached.unseen)
    }
  }, [role])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  return { count, reload: load }
}
