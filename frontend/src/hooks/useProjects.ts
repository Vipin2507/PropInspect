import { useEffect, useState, useCallback, useRef } from 'react'
import { projectsApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { Project } from '../types'

// Module-level memory cache — survives remounts
let memCache: Project[] = []

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(memCache)
  const [loading, setLoading] = useState(memCache.length === 0)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const refresh = useCallback(async () => {
    // Phase 1: IndexedDB if memory is empty
    if (memCache.length === 0) {
      try {
        const db = await getDb()
        const cached = (await db.getAll('projects')) as unknown as Project[]
        if (cached.length > 0) {
          memCache = cached
          if (mounted.current) { setProjects(cached); setLoading(false) }
        }
      } catch { /* ignore */ }
    }

    // Phase 2: Network
    try {
      const { data } = await projectsApi.list()
      const db = await getDb()
      const tx = db.transaction('projects', 'readwrite')
      for (const p of data) await tx.store.put(p as unknown as Record<string, unknown>)
      await tx.done
      memCache = data
      if (mounted.current) { setProjects(data); setError(null) }
    } catch {
      if (memCache.length === 0 && mounted.current) setError('No projects available offline')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { projects, loading, error, refresh }
}
