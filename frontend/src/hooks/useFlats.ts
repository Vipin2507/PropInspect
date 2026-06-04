import { useEffect, useState, useCallback } from 'react'
import { flatsApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import type { Flat } from '../types'

export function useFlats(projectId?: string) {
  const user = useAuthStore((s) => s.user)
  const [flats, setFlats] = useState<Flat[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = projectId
        ? await flatsApi.byProject(projectId)
        : await flatsApi.byEngineer(user.id)
      setFlats(data)
    } finally {
      setLoading(false)
    }
  }, [user, projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { flats, loading, refresh }
}
