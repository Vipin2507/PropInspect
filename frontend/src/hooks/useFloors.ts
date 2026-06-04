import { useEffect, useState } from 'react'
import { floorsApi } from '../utils/api'
import type { Floor } from '../types'

export function useFloors(towerId: string | null) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!towerId) return
    setLoading(true)
    floorsApi.list(towerId).then(({ data }) => setFloors(data)).finally(() => setLoading(false))
  }, [towerId])

  return { floors, loading }
}
