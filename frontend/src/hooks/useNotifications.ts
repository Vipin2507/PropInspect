import { useEffect, useState } from 'react'
import { notificationsApi } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import type { Notification } from '../types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const fetchCount = useNotificationStore((s) => s.fetchCount)

  const refresh = async () => {
    const { data } = await notificationsApi.list()
    setNotifications(data)
    await fetchCount()
  }

  useEffect(() => {
    refresh().catch(() => {})
  }, [])

  return { notifications, refresh }
}
