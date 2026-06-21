import { create } from 'zustand'
import { notificationsApi } from '../utils/api'

interface NotificationStore {
  unreadCount: number
  fetchCount: () => Promise<void>
  setUnreadCount: (n: number) => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  fetchCount: async () => {
    try {
      const { data } = await notificationsApi.count()
      set({ unreadCount: data.unread })
    } catch {
      /* offline */
    }
  },
}))
