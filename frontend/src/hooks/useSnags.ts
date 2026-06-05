import { useEffect, useState } from 'react'
import { snagsApi } from '../utils/api'
import type { Snag } from '../types'

export function useSnags(params: { flatId?: string; projectId?: string; inspectionId?: string }) {
  const [snags, setSnags] = useState<Snag[]>([])
  const [loading, setLoading] = useState(true)

  // Destructure to primitives so the effect only re-runs when values actually change
  const { flatId, projectId, inspectionId } = params

  useEffect(() => {
    if (!flatId && !projectId && !inspectionId) {
      setLoading(false)
      return
    }
    setLoading(true)
    snagsApi
      .list({ flatId, projectId, inspectionId })
      .then(({ data }) => setSnags(data))
      .catch(() => setSnags([]))
      .finally(() => setLoading(false))
  }, [flatId, projectId, inspectionId])

  return { snags, loading, setSnags }
}
