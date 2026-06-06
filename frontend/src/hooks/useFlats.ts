import { useEffect, useState, useCallback } from 'react'
import { flatsApi, projectsApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import type { Flat } from '../types'

export function useFlats(projectId?: string) {
  const user = useAuthStore((s) => s.user)
  const [flats, setFlats]   = useState<Flat[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      if (projectId) {
        // Explicit project filter — used by admin flat management
        const { data } = await flatsApi.byProject(projectId)
        setFlats(data)
      } else if (user.role === 'admin') {
        // Admin sees all flats across every project
        const { data: projects } = await projectsApi.list()
        const results = await Promise.all(
          projects.map((p) => flatsApi.byProject(p.id).then((r) => r.data))
        )
        setFlats(results.flat())
      } else {
        // Engineer (and any other role) sees only their assigned flats
        const { data } = await flatsApi.byEngineer(user.id)
        setFlats(data)
      }
    } finally {
      setLoading(false)
    }
  }, [user, projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { flats, loading, refresh }
}
