import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Users,
  FileText,
  Wrench,
  ListChecks,
  X,
  LogOut,
  UserCircle,
  ClipboardCheck,
  History,
  Bell,
  MonitorDot,
  Activity,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuthStore } from '../../store/authStore'
import { ROUTES } from '../../constants/routes'
import { useEffect } from 'react'
import { useNotificationStore } from '../../store/notificationStore'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard }

// Admin sees everything — admin dashboard + all engineer + all QA + all admin tools
const adminNav: NavItem[] = [
  { to: ROUTES.ADMIN,             label: 'Dashboard',      icon: LayoutDashboard },
  { to: ROUTES.ADMIN_PROJECTS,    label: 'Projects',       icon: Building2 },
  { to: ROUTES.ENGINEER_FLATS,    label: 'All Flats',      icon: ClipboardList },
  { to: ROUTES.QA_REVIEWS,        label: 'QA Reviews',     icon: ClipboardCheck },
  { to: ROUTES.QA_HISTORY,        label: 'Review History', icon: History },
  { to: ROUTES.DESNAGGING,        label: 'De-Snagging',    icon: Wrench },
  { to: ROUTES.ADMIN_MONITORING,  label: 'Monitoring',     icon: MonitorDot },
  { to: ROUTES.ADMIN_ACTIVITY,    label: 'Activity Log',   icon: Activity },
  { to: ROUTES.ADMIN_USERS,       label: 'Users',          icon: Users },
  { to: ROUTES.ADMIN_TEMPLATES,   label: 'Templates',      icon: ListChecks },
  { to: ROUTES.ADMIN_REPORTS,     label: 'Reports',        icon: FileText },
]

const navByRole: Record<string, NavItem[]> = {
  admin: adminNav,
  engineer: [
    { to: ROUTES.ENGINEER_DASHBOARD,    label: 'Dashboard',      icon: LayoutDashboard },
    { to: ROUTES.ENGINEER_FLATS,        label: 'All Flats',      icon: Building2 },
    { to: ROUTES.DESNAGGING,            label: 'De-Snagging',    icon: Wrench },
    { to: ROUTES.ENGINEER_NOTIFICATIONS, label: 'Notifications', icon: Bell },
  ],
  qa: [
    { to: ROUTES.QA_DASHBOARD, label: 'Dashboard',      icon: LayoutDashboard },
    { to: ROUTES.QA_REVIEWS,   label: 'Reviews',        icon: ClipboardList },
    { to: ROUTES.QA_HISTORY,   label: 'History',        icon: FileText },
    { to: ROUTES.DESNAGGING,   label: 'De-Snagging',    icon: Wrench },
    { to: ROUTES.ENGINEER_NOTIFICATIONS, label: 'Notifications', icon: Bell },
  ],
  viewer: [
    { to: ROUTES.ADMIN,        label: 'Dashboard', icon: LayoutDashboard },
    { to: ROUTES.ADMIN_REPORTS, label: 'Reports',  icon: FileText },
  ],
}

function SidebarNav({
  isCollapsed,
  onNavigate,
}: {
  isCollapsed?: boolean
  onNavigate?: () => void
}) {
  const user  = useAuthStore((s) => s.user)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const items = navByRole[user?.role || 'engineer'] || []

  return (
    <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === ROUTES.ADMIN}  // exact match for admin dashboard only
          onClick={onNavigate}
          title={label}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
              'min-h-[44px] touch-manipulation transition-colors',
              isCollapsed ? 'justify-center' : 'justify-start',
              isActive
                ? 'bg-sidebar-active text-white'
                : 'text-slate-300 active:bg-white/10',
              !isActive && '[@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-white'
            )
          }
        >
          <div className="relative shrink-0">
            <Icon size={20} aria-hidden="true" />
            {to === ROUTES.ENGINEER_NOTIFICATIONS && unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-fail text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <span className="flex-1">{label}</span>
          )}
          {!isCollapsed && to === ROUTES.ENGINEER_NOTIFICATIONS && unreadCount > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-fail px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export function Sidebar({
  isCollapsed,
  isMobile,
  isOpen,
  onClose,
}: {
  isCollapsed?: boolean
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
}) {
  const { logout } = useAuthStore()
  const location   = useLocation()

  useEffect(() => {
    if (isMobile && isOpen) onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const content = (
    <>
      {/* Logo row */}
      <div className={cn('flex h-16 shrink-0 items-center px-4', isCollapsed ? 'justify-center' : 'justify-between')}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white">
              S
            </div>
            <span className="font-bold text-white">SnagDesk</span>
          </div>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-300 active:bg-white/10"
            aria-label="Close menu"
          >
            <X size={24} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <SidebarNav isCollapsed={isCollapsed} onNavigate={onClose} />

      {/* Bottom: Profile + Logout */}
      <div className="shrink-0 space-y-0.5 p-2 pb-safe">
        <NavLink
          to={ROUTES.PROFILE}
          onClick={onClose}
          title="My Profile"
          className={({ isActive }) =>
            cn(
              'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium touch-manipulation',
              isCollapsed ? 'justify-center' : 'justify-start',
              isActive
                ? 'bg-sidebar-active text-white'
                : 'text-slate-300 active:bg-white/10 [@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-white'
            )
          }
        >
          <UserCircle size={20} className="shrink-0" aria-hidden="true" />
          {!isCollapsed && <span>My Profile</span>}
        </NavLink>

        <button
          type="button"
          onClick={logout}
          title="Logout"
          className={cn(
            'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 touch-manipulation',
            'active:bg-white/10 [@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-white',
            isCollapsed ? 'justify-center' : 'justify-start'
          )}
        >
          <LogOut size={20} className="shrink-0" aria-hidden="true" />
          {!isCollapsed && <span>Logout</span>}
        </button>

        {!isCollapsed && (
          <p className="px-3 py-1 text-center text-xs text-slate-600">v1.0.0</p>
        )}
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onClose}
          aria-hidden="true"
        />
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[min(80%,280px)] flex-col bg-sidebar text-slate-300 shadow-xl transition-transform md:hidden',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
        >
          {content}
        </aside>
      </>
    )
  }

  return (
    <aside className={cn('flex h-full flex-col bg-sidebar text-slate-300', isCollapsed ? 'w-[68px]' : 'w-60')}>
      {content}
    </aside>
  )
}
