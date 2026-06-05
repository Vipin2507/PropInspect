import { useEffect, useState, useCallback } from 'react'
import { notificationsApi } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import type { Notification } from '../types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const fetchCount = useNotificationStore((s) => s.fetchCount)

  const refresh = useCallback(async () => {
    const { data } = await notificationsApi.list()
    setNotifications(data)
    await fetchCount()
  }, [fetchCount])

  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  return { notifications, refresh }
}
