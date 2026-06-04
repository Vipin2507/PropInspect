import { useEffect, useState } from 'react'
import { reviewsApi } from '../utils/api'

export function useReviewQueue(filter?: string) {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    reviewsApi.queue(filter).then(({ data }) => setItems(data)).finally(() => setLoading(false))
  }, [filter])

  return { items, loading }
}

export function useReviewHistory() {
  const [history, setHistory] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reviewsApi.history().then(({ data }) => setHistory(data)).finally(() => setLoading(false))
  }, [])

  return { history, loading }
}
