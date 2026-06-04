import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { OfflineBanner } from './OfflineBanner'
import { useEffect, useState } from 'react'
import { initSyncListeners } from '../../utils/sync'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const fetchCount = useNotificationStore((s) => s.fetchCount)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const cleanup = initSyncListeners(
      user?.role === 'engineer' ? user.id : undefined
    )
    fetchCount()
    return cleanup
  }, [user?.id, user?.role, fetchCount])

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false)
    }
  }, [location.pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      {/* Desktop/Tablet Sidebar */}
      <div className="hidden lg:flex lg:w-60 lg:flex-shrink-0">
        <Sidebar />
      </div>
      <div className="hidden md:flex md:w-[68px] md:flex-shrink-0 lg:hidden">
        <Sidebar isCollapsed />
      </div>

      {/* Mobile Sidebar */}
      <Sidebar
        isMobile
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-4 pt-0 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
