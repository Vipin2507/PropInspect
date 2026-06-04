import { useEffect, useState } from 'react'
import { snagsApi } from '../utils/api'
import type { Snag } from '../types'

export function useSnags(params: { flatId?: string; projectId?: string; inspectionId?: string }) {
  const [snags, setSnags] = useState<Snag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.flatId && !params.projectId && !params.inspectionId) return
    setLoading(true)
    snagsApi
      .list(params)
      .then(({ data }) => setSnags(data))
      .catch(() => setSnags([]))
      .finally(() => setLoading(false))
  }, [params.flatId, params.projectId, params.inspectionId])

  return { snags, loading, setSnags }
}
