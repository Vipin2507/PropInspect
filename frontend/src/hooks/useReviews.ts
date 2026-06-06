import { useEffect, useState, useCallback } from 'react'
import { reviewsApi } from '../utils/api'

const QUEUE_KEY = 'review_queue_cache'
const HISTORY_KEY = 'review_history_cache'

export function useReviewQueue(filter?: string) {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      try {
        const cached = localStorage.getItem(QUEUE_KEY)
        if (cached) { setItems(JSON.parse(cached)); setLoading(false) }
        const { data } = await reviewsApi.queue(filter)
        localStorage.setItem(QUEUE_KEY, JSON.stringify(data))
        setItems(data)
      } catch { /* keep cached */ }
      finally { setLoading(false) }
    })()
  }, [filter])

  return { items, loading }
}

export function useReviewHistory() {
  const [history, setHistory] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cached = localStorage.getItem(HISTORY_KEY)
      if (cached) { setHistory(JSON.parse(cached)); setLoading(false) }
      const { data } = await reviewsApi.history()
      localStorage.setItem(HISTORY_KEY, JSON.stringify(data))
      setHistory(data)
    } catch { /* keep cached */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return { history, loading }
}
