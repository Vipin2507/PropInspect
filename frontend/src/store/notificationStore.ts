import { create } from 'zustand'
import { notificationsApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { Notification } from '../types'

interface NotificationStore {
  unreadCount: number
  fetchCount: () => Promise<void>
  setUnreadCount: (n: number) => void
}

async function unreadFromCache(): Promise<number> {
  try {
    const db = await getDb()
    const all = (await db.getAll('notifications')) as unknown as Notification[]
    return all.filter((n) => !n.isRead).length
  } catch {
    return 0
  }
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  fetchCount: async () => {
    try {
      const { data } = await notificationsApi.count()
      set({ unreadCount: data.unread })
    } catch {
      const cached = await unreadFromCache()
      set({ unreadCount: cached })
    }
  },
}))
