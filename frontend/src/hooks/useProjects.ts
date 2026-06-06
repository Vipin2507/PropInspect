import { useEffect, useState, useCallback } from 'react'
import { projectsApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { Project } from '../types'

async function getCachedProjects(): Promise<Project[]> {
  try {
    const db = await getDb()
    return (await db.getAll('projects')) as unknown as Project[]
  } catch { return [] }
}

async function cacheProjects(projects: Project[]): Promise<void> {
  try {
    const db = await getDb()
    const tx = db.transaction('projects', 'readwrite')
    for (const p of projects) await tx.store.put(p as unknown as Record<string, unknown>)
    await tx.done
  } catch { /* non-fatal */ }
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)

    const cached = await getCachedProjects()
    if (cached.length > 0) {
      setProjects(cached)
      setLoading(false)
    }

    try {
      const { data } = await projectsApi.list()
      await cacheProjects(data)
      setProjects(data)
      setError(null)
    } catch {
      if (cached.length === 0) setError('No projects available offline')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { projects, loading, error, refresh }
}
