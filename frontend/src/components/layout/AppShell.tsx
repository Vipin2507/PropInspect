import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { OfflineBanner } from './OfflineBanner'
import { useEffect, useState } from 'react'
import { initSyncListeners } from '../../utils/sync'
import { prefetchAll } from '../../utils/prefetch'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const fetchCount = useNotificationStore((s) => s.fetchCount)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

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

  // Background prefetch — download ALL data to IndexedDB right after login
  useEffect(() => {
    if (!user) return
    // Small delay so the dashboard renders first, then prefetch runs in background
    const t = setTimeout(() => {
      prefetchAll(user).catch(() => {})
    }, 2000)
    return () => clearTimeout(t)
  }, [user?.id]) // re-run only when the logged-in user changes

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  return (
    // h-full inherits 100dvh from #root — never use h-screen here
    <div className="flex h-full bg-slate-100 text-slate-800">

      {/* Desktop sidebar (≥1024px) */}
      <div className="hidden lg:flex lg:w-60 lg:shrink-0">
        <Sidebar />
      </div>
      {/* Tablet icon sidebar (768–1023px) */}
      <div className="hidden md:flex md:w-[68px] md:shrink-0 lg:hidden">
        <Sidebar isCollapsed />
      </div>

      {/* Mobile slide-in sidebar */}
      <Sidebar isMobile isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <OfflineBanner />
        {/* flex-1 + overflow-y-auto = only this scrolls, shell stays fixed */}
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 pb-safe md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
