import { useEffect, useState } from 'react'
import { projectsApi } from '../utils/api'
import type { Project } from '../types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const { data } = await projectsApi.list()
      setProjects(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return { projects, loading, error, refresh }
}
