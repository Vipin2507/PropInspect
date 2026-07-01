import { useCallback, useEffect, useState } from 'react'
import { engineerFeedbackApi } from '../utils/api'
import type { EngineerFeedbackGroup } from '../types'
import { useAuthStore } from '../store/authStore'

export function useEngineerFeedback(filters: { flatId?: string; unseenOnly?: boolean } = {}) {
  const role = useAuthStore((s) => s.user?.role)
  const [groups, setGroups] = useState<EngineerFeedbackGroup[]>([])
  const [totalUnseen, setTotalUnseen] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (role !== 'engineer' && role !== 'admin') return
    setLoading(true)
    try {
      const { data } = await engineerFeedbackApi.list({
        flatId: filters.flatId,
        unseenOnly: filters.unseenOnly ?? true,
      })
      setGroups(data.groups)
      setTotalUnseen(data.totalUnseen)
    } catch {
      /* keep previous */
    } finally {
      setLoading(false)
    }
  }, [role, filters.flatId, filters.unseenOnly])

  useEffect(() => {
    load()
  }, [load])

  const markFlatSeen = useCallback(async (flatId: string) => {
    const { data } = await engineerFeedbackApi.markFlatSeen(flatId)
    setGroups((prev) => prev.filter((g) => g.flatId !== flatId))
    setTotalUnseen((n) => Math.max(0, n - data.markedCount))
    return data.markedCount
  }, [])

  return { groups, totalUnseen, loading, reload: load, markFlatSeen }
}

export function useEngineerFeedbackCount() {
  const role = useAuthStore((s) => s.user?.role)
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (role !== 'engineer' && role !== 'admin') return
    try {
      const { data } = await engineerFeedbackApi.count()
      setCount(data.unseen)
    } catch {
      /* ignore */
    }
  }, [role])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  return { count, reload: load }
}
