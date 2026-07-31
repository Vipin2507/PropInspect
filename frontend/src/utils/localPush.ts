/**
 * Foreground local notifications (Capacitor).
 * Fires when the app is open and new in-app notifications arrive.
 */
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { Notification } from '../types'

const CHANNEL_ID = 'propinspect_activity'
const SEEN_KEY = 'snagdesk_seen_notif_ids'
const MAX_SEEN = 200

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveSeenIds(ids: Set<string>): void {
  const arr = [...ids].slice(-MAX_SEEN)
  localStorage.setItem(SEEN_KEY, JSON.stringify(arr))
}

export async function initLocalNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions()
    }
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Activity',
      description: 'Flat inspection activity alerts',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: 'default',
    })
  } catch (err) {
    console.warn('[localPush] init failed:', err)
  }
}

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) % 2_000_000_000 || 1
}

export async function showLocalNotification(n: {
  id: string
  title: string
  body: string
  relatedId?: string
  type?: string
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: hashId(n.id),
          title: n.title,
          body: n.body,
          channelId: CHANNEL_ID,
          extra: {
            notificationId: n.id,
            relatedId: n.relatedId ?? '',
            type: n.type ?? '',
          },
        },
      ],
    })
  } catch (err) {
    console.warn('[localPush] schedule failed:', err)
  }
}

/**
 * Compare fresh list to previously seen IDs; schedule local notifs for new unread ones.
 * Seeds seen set on first run so historical items don't flood the panel.
 */
export async function announceNewNotifications(
  items: Notification[]
): Promise<Notification[]> {
  const seen = loadSeenIds()
  const isFirstSeed = seen.size === 0
  const fresh: Notification[] = []

  for (const n of items) {
    if (seen.has(n.id)) continue
    seen.add(n.id)
    if (!isFirstSeed && !n.isRead) fresh.push(n)
  }
  saveSeenIds(seen)

  if (!isFirstSeed) {
    for (const n of fresh.slice(0, 5)) {
      await showLocalNotification({
        id: n.id,
        title: n.title,
        body: n.message,
        relatedId: n.relatedId,
        type: n.type,
      })
    }
  }

  return fresh
}

export function addLocalNotificationTapListener(
  handler: (extra: { notificationId?: string; relatedId?: string; type?: string }) => void
): () => void {
  if (!Capacitor.isNativePlatform()) return () => {}

  let remove: (() => void) | undefined
  LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const extra = (event.notification.extra || {}) as {
      notificationId?: string
      relatedId?: string
      type?: string
    }
    handler(extra)
  }).then((handle) => {
    remove = () => {
      handle.remove()
    }
  })

  return () => {
    remove?.()
  }
}
