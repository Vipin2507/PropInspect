import { useEffect, useState, useCallback } from 'react'
import { flatsApi, projectsApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { getDb } from '../utils/db'
import type { Flat } from '../types'

async function getCachedFlats(userId: string, role: string): Promise<Flat[]> {
  try {
    const db = await getDb()
    if (role === 'admin') return (await db.getAll('flats')) as unknown as Flat[]
    return (await db.getAllFromIndex('flats', 'by-engineer', userId)) as unknown as Flat[]
  } catch { return [] }
}

async function cacheFlats(flats: Flat[]): Promise<void> {
  try {
    const db = await getDb()
    const tx = db.transaction('flats', 'readwrite')
    for (const f of flats) await tx.store.put(f as unknown as Record<string, unknown>)
    await tx.done
  } catch { /* non-fatal */ }
}

export function useFlats(projectId?: string) {
  const user = useAuthStore((s) => s.user)
  const [flats, setFlats] = useState<Flat[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. Serve cached data immediately so UI is never blank offline
    const cached = await getCachedFlats(user.id, user.role)
    if (cached.length > 0) {
      const filtered = projectId ? cached.filter((f) => f.projectId === projectId) : cached
      setFlats(filtered)
      setLoading(false)
    }

    // 2. Try network refresh
    try {
      let fresh: Flat[] = []
      if (projectId) {
        const { data } = await flatsApi.byProject(projectId)
        fresh = data
      } else if (user.role === 'admin') {
        const { data: projects } = await projectsApi.list()
        const results = await Promise.all(
          projects.map((p) => flatsApi.byProject(p.id).then((r) => r.data))
        )
        fresh = results.flat()
      } else {
        const { data } = await flatsApi.byEngineer(user.id)
        fresh = data
      }
      await cacheFlats(fresh)
      setFlats(fresh)
    } catch {
      // Network failed — cached data already shown above
      if (cached.length === 0) setFlats([])
    } finally {
      setLoading(false)
    }
  }, [user, projectId])

  useEffect(() => { refresh() }, [refresh])

  return { flats, loading, refresh }
}
