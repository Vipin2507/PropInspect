import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { OfflineBanner } from './OfflineBanner'
import { useEffect, useState } from 'react'
import { initSyncListeners } from '../../utils/sync'
import { prefetchAll } from '../../utils/prefetch'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { usePrefetchStore } from '../../store/prefetchStore'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { notificationsApi } from '../../utils/api'
import {
  addLocalNotificationTapListener,
  announceNewNotifications,
  initLocalNotifications,
} from '../../utils/localPush'
import { resolveNotificationRoute, warmRouteData } from '../../utils/notificationNavigation'
import type { Notification } from '../../types'
import { cn } from '../../utils/cn'

const SIDEBAR_KEY = 'snagdesk_sidebar_collapsed'

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const fetchCount = useNotificationStore((s) => s.fetchCount)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })
  const location = useLocation()
  const navigate = useNavigate()

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch { /* ignore */ }
      return next
    })
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
    StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {})
  }, [])

  useEffect(() => {
    const cleanup = initSyncListeners(user?.role === 'engineer' ? user.id : undefined)
    fetchCount()
    return cleanup
  }, [user?.id, user?.role, fetchCount])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    initLocalNotifications().catch(() => {})

    const poll = async () => {
      try {
        const { data } = await notificationsApi.list()
        if (cancelled) return
        const list = data as Notification[]
        const unread = list.filter((n) => !n.isRead).length
        setUnreadCount(unread)
        await announceNewNotifications(list)
      } catch {
        await fetchCount()
      }
    }

    poll()
    const interval = setInterval(poll, 30_000)

    const removeTap = addLocalNotificationTapListener(async (extra) => {
      try {
        if (extra.notificationId) {
          await notificationsApi.markRead(extra.notificationId).catch(() => {})
        }
        const fake: Notification = {
          id: extra.notificationId || '',
          userId: user.id,
          type: (extra.type as Notification['type']) || 'inspection_submitted',
          title: '',
          message: '',
          relatedId: extra.relatedId || '',
          isRead: false,
          createdAt: new Date().toISOString(),
        }
        const route = await resolveNotificationRoute(fake, user.role)
        await warmRouteData(route)
        navigate(route)
        fetchCount()
      } catch {
        navigate(ROUTES_FALLBACK(user.role))
      }
    })

    return () => {
      cancelled = true
      clearInterval(interval)
      removeTap()
    }
  }, [user?.id, user?.role, fetchCount, setUnreadCount, navigate, user])

  useEffect(() => {
    if (!user) {
      usePrefetchStore.getState().setStatus('idle')
      return
    }

    let cancelled = false
    usePrefetchStore.getState().setStatus('loading')

    prefetchAll(user)
      .then(() => {
        if (!cancelled) usePrefetchStore.getState().setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) usePrefetchStore.getState().setStatus('error')
      })

    return () => { cancelled = true }
  }, [user?.id, user?.role])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  return (
    <div className="flex h-full bg-brand-50 text-ink-800">
      {/* Desktop / tablet sidebar — width animates */}
      <div
        className={cn(
          'hidden h-full shrink-0 overflow-hidden md:flex',
          'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          sidebarCollapsed ? 'w-14' : 'w-52'
        )}
      >
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      <Sidebar
        isMobile
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto overscroll-contain p-3 pb-safe md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function ROUTES_FALLBACK(role: string): string {
  if (role === 'qa') return '/qa/dashboard'
  if (role === 'admin') return '/admin'
  return '/engineer/dashboard'
}
