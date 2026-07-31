import { useEffect, useState, useCallback } from 'react'
import { notificationsApi } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import { getDb } from '../utils/db'
import type { Notification } from '../types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const fetchCount = useNotificationStore((s) => s.fetchCount)

  const refresh = useCallback(async () => {
    // 1. Serve cached immediately
    try {
      const db = await getDb()
      const cached = (await db.getAll('notifications')) as unknown as Notification[]
      if (cached.length > 0) {
        setNotifications(
          cached.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        )
        setLoading(false)
      }
    } catch { /* ignore */ }

    // 2. Network refresh
    try {
      const { data } = await notificationsApi.list()
      const db = await getDb()
      const tx = db.transaction('notifications', 'readwrite')
      for (const n of data) await tx.store.put(n as unknown as Record<string, unknown>)
      await tx.done
      setNotifications(data)
      await fetchCount()
    } catch { /* keep cached */ }
    finally {
      setLoading(false)
    }
  }, [fetchCount])

  useEffect(() => { refresh().catch(() => {}) }, [refresh])

  return { notifications, refresh, loading }
}
