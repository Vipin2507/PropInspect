import { useEffect, useState, useCallback } from 'react'
import { reviewsApi } from '../utils/api'

const QUEUE_KEY = 'review_queue_cache'
const HISTORY_KEY = 'review_history_cache'

export function useReviewQueue(filter?: string) {
  const [items, setItems] = useState<unknown[]>(() => {
    // Initialise synchronously from localStorage — no spinner if cached
    try {
      const cached = localStorage.getItem(QUEUE_KEY)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(!localStorage.getItem(QUEUE_KEY))

  useEffect(() => {
    reviewsApi.queue(filter)
      .then(({ data }) => {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(data))
        setItems(data)
      })
      .catch(() => { /* keep cached */ })
      .finally(() => setLoading(false))
  }, [filter])

  return { items, loading }
}

export function useReviewHistory() {
  const [history, setHistory] = useState<unknown[]>(() => {
    try {
      const cached = localStorage.getItem(HISTORY_KEY)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(!localStorage.getItem(HISTORY_KEY))

  const load = useCallback(async () => {
    try {
      const { data } = await reviewsApi.history()
      localStorage.setItem(HISTORY_KEY, JSON.stringify(data))
      setHistory(data)
    } catch { /* keep cached */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return { history, loading }
}
