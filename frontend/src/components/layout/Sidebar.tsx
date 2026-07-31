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
  ScrollText,
  Settings2,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuthStore } from '../../store/authStore'
import { ROUTES } from '../../constants/routes'
import { useEffect } from 'react'
import { useNotificationStore } from '../../store/notificationStore'
import { useQaChangesCount } from '../../hooks/useQaChanges'
import { useEngineerFeedbackCount } from '../../hooks/useEngineerFeedback'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard }

type NavSection = { title?: string; items: NavItem[] }

const adminSections: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { to: ROUTES.ADMIN, label: 'Dashboard', icon: LayoutDashboard },
      { to: ROUTES.ADMIN_PROJECTS, label: 'Projects', icon: Building2 },
      { to: ROUTES.ENGINEER_FLATS, label: 'All Flats', icon: ClipboardList },
    ],
  },
  {
    title: 'Quality',
    items: [
      { to: ROUTES.ENGINEER_CHANGES, label: 'QA Feedback', icon: ScrollText },
      { to: ROUTES.QA_ALL_FLATS, label: 'QA All Flats', icon: Building2 },
      { to: ROUTES.QA_CHANGES, label: 'Changes Log', icon: ScrollText },
      { to: ROUTES.QA_REVIEWS, label: 'Submitted Reviews', icon: ClipboardCheck },
      { to: ROUTES.QA_HISTORY, label: 'Review History', icon: History },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: ROUTES.DESNAGGING, label: 'De-Snagging', icon: Wrench },
      { to: ROUTES.ADMIN_MONITORING, label: 'Monitoring', icon: MonitorDot },
      { to: ROUTES.ADMIN_ACTIVITY, label: 'Activity Log', icon: Activity },
      { to: ROUTES.ENGINEER_NOTIFICATIONS, label: 'Notifications', icon: Bell },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to: ROUTES.ADMIN_NOTIF_SETTINGS, label: 'Notif. Settings', icon: Settings2 },
      { to: ROUTES.ADMIN_USERS, label: 'Users', icon: Users },
      { to: ROUTES.ADMIN_TEMPLATES, label: 'Templates', icon: ListChecks },
      { to: ROUTES.ADMIN_REPORTS, label: 'Reports', icon: FileText },
    ],
  },
]

const sectionsByRole: Record<string, NavSection[]> = {
  admin: adminSections,
  engineer: [
    {
      items: [
        { to: ROUTES.ENGINEER_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
        { to: ROUTES.ENGINEER_FLATS, label: 'All Flats', icon: Building2 },
        { to: ROUTES.ENGINEER_CHANGES, label: 'QA Feedback', icon: ScrollText },
        { to: ROUTES.DESNAGGING, label: 'De-Snagging', icon: Wrench },
        { to: ROUTES.ENGINEER_NOTIFICATIONS, label: 'Notifications', icon: Bell },
      ],
    },
  ],
  qa: [
    {
      items: [
        { to: ROUTES.QA_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
        { to: ROUTES.QA_ALL_FLATS, label: 'All Flats', icon: Building2 },
        { to: ROUTES.QA_CHANGES, label: 'Changes Log', icon: ScrollText },
        { to: ROUTES.QA_REVIEWS, label: 'Submitted Reviews', icon: ClipboardCheck },
        { to: ROUTES.QA_HISTORY, label: 'History', icon: FileText },
        { to: ROUTES.DESNAGGING, label: 'De-Snagging', icon: Wrench },
        { to: ROUTES.ENGINEER_NOTIFICATIONS, label: 'Notifications', icon: Bell },
      ],
    },
  ],
  viewer: [
    {
      items: [
        { to: ROUTES.ADMIN, label: 'Dashboard', icon: LayoutDashboard },
        { to: ROUTES.ADMIN_REPORTS, label: 'Reports', icon: FileText },
      ],
    },
  ],
}

function NavBadge({ count, pulse }: { count: number; pulse?: boolean }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger-600 px-1.5 text-[10px] font-bold text-white',
        pulse && 'animate-badge-pulse'
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

function SidebarNav({
  isCollapsed,
  onNavigate,
}: {
  isCollapsed?: boolean
  onNavigate?: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const { count: unreviewedChanges } = useQaChangesCount()
  const { count: unseenFeedback } = useEngineerFeedbackCount()
  const sections = sectionsByRole[user?.role || 'engineer'] || []

  const badgeFor = (to: string) => {
    if (to === ROUTES.ENGINEER_NOTIFICATIONS) return unreadCount
    if (to === ROUTES.QA_CHANGES) return unreviewedChanges
    if (to === ROUTES.ENGINEER_CHANGES) return unseenFeedback
    return 0
  }

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-1">
      {sections.map((section, si) => (
        <div key={si} className="space-y-0.5">
          {section.title && !isCollapsed && (
            <p className="px-3 pb-1 pt-2 text-caption uppercase tracking-wide text-white/40">
              {section.title}
            </p>
          )}
          {section.items.map(({ to, label, icon: Icon }) => {
            const count = badgeFor(to)
            return (
              <NavLink
                key={to}
                to={to}
                end={to === ROUTES.ADMIN}
                onClick={onNavigate}
                title={label}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium touch-manipulation transition-colors duration-fast',
                    isCollapsed ? 'justify-center' : 'justify-start',
                    isActive
                      ? 'bg-brand-600/20 font-semibold text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white active:bg-white/10'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" />
                    )}
                    <div className="relative shrink-0">
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                      {isCollapsed && count > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-600 text-[9px] font-bold text-white animate-badge-pulse">
                          {count > 9 ? '9+' : count}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
                    {!isCollapsed && <NavBadge count={count} pulse={count > 0} />}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
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
  const location = useLocation()

  useEffect(() => {
    if (isMobile && isOpen) onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const shellClass =
    'flex flex-col text-white bg-[linear-gradient(180deg,var(--brand-950),var(--brand-900))]'

  const content = (
    <>
      <div
        className={cn(
          'flex h-16 shrink-0 items-center px-4',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 font-display text-sm font-bold text-brand-700 shadow-md">
              S
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-bold text-white">SnagDesk</p>
              <p className="text-[11px] text-white/45">by Buildesk</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 font-display text-sm font-bold text-brand-700 shadow-md">
            S
          </div>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 active:bg-white/10"
            aria-label="Close menu"
          >
            <X size={24} aria-hidden />
          </button>
        )}
      </div>

      <SidebarNav isCollapsed={isCollapsed} onNavigate={onClose} />

      <div className="shrink-0 space-y-0.5 border-t border-white/10 p-2 pb-safe">
        <NavLink
          to={ROUTES.PROFILE}
          onClick={onClose}
          title="My Profile"
          className={({ isActive }) =>
            cn(
              'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium touch-manipulation',
              isCollapsed ? 'justify-center' : 'justify-start',
              isActive
                ? 'bg-brand-600/20 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white active:bg-white/10'
            )
          }
        >
          <UserCircle size={20} className="shrink-0" aria-hidden />
          {!isCollapsed && <span>My Profile</span>}
        </NavLink>

        <button
          type="button"
          onClick={logout}
          title="Logout"
          className={cn(
            'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger-100/90 touch-manipulation',
            'hover:bg-danger-600/20 hover:text-white active:bg-danger-600/20',
            isCollapsed ? 'justify-center' : 'justify-start'
          )}
        >
          <LogOut size={20} className="shrink-0" aria-hidden />
          {!isCollapsed && <span>Logout</span>}
        </button>

        {!isCollapsed && (
          <p className="px-3 py-1 text-center text-caption text-white/30">v1.0.0</p>
        )}
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            'fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm transition-opacity md:hidden',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onClose}
          aria-hidden
        />
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-[min(80%,280px)] shadow-lg transition-transform md:hidden',
            shellClass,
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
    <aside className={cn(shellClass, 'h-full', isCollapsed ? 'w-[68px]' : 'w-[280px]')}>
      {content}
    </aside>
  )
}
