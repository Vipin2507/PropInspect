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
  ChevronsLeft,
  ChevronsRight,
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
      { to: ROUTES.QA_REVIEWS, label: 'Reviews', icon: ClipboardCheck },
      { to: ROUTES.QA_HISTORY, label: 'History', icon: History },
    ],
  },
  {
    title: 'Ops',
    items: [
      { to: ROUTES.DESNAGGING, label: 'De-Snagging', icon: Wrench },
      { to: ROUTES.ADMIN_MONITORING, label: 'Monitoring', icon: MonitorDot },
      { to: ROUTES.ADMIN_ACTIVITY, label: 'Activity', icon: Activity },
      { to: ROUTES.ENGINEER_NOTIFICATIONS, label: 'Alerts', icon: Bell },
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
        { to: ROUTES.ENGINEER_NOTIFICATIONS, label: 'Alerts', icon: Bell },
      ],
    },
  ],
  qa: [
    {
      items: [
        { to: ROUTES.QA_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
        { to: ROUTES.QA_ALL_FLATS, label: 'All Flats', icon: Building2 },
        { to: ROUTES.QA_CHANGES, label: 'Changes', icon: ScrollText },
        { to: ROUTES.QA_REVIEWS, label: 'Reviews', icon: ClipboardCheck },
        { to: ROUTES.QA_HISTORY, label: 'History', icon: FileText },
        { to: ROUTES.DESNAGGING, label: 'De-Snagging', icon: Wrench },
        { to: ROUTES.ENGINEER_NOTIFICATIONS, label: 'Alerts', icon: Bell },
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

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-600 px-1 text-[9px] font-bold text-white">
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
    <nav
      className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden py-1',
        isCollapsed ? 'flex flex-col items-center gap-1 px-0' : 'space-y-3 px-1.5'
      )}
    >
      {sections.map((section, si) => (
        <div
          key={si}
          className={cn(isCollapsed ? 'flex w-full flex-col items-center gap-1' : 'space-y-0.5')}
        >
          {section.title && !isCollapsed && (
            <p className="px-2.5 pb-0.5 pt-1 text-[9px] font-semibold uppercase tracking-wider text-white/35">
              {section.title}
            </p>
          )}
          {isCollapsed && si > 0 && (
            <div className="my-0.5 h-px w-5 bg-white/10" aria-hidden />
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
                    'relative touch-manipulation transition-colors duration-150',
                    isCollapsed
                      ? cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg',
                          isActive
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'text-white/70 hover:bg-white/15 hover:text-white active:bg-white/20'
                        )
                      : cn(
                          'flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium',
                          isActive
                            ? 'bg-brand-600/25 font-semibold text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white active:bg-white/10'
                        )
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {!isCollapsed && isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" />
                    )}
                    <div className="relative flex shrink-0 items-center justify-center">
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                      {isCollapsed && count > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-danger-600 px-0.5 text-[8px] font-bold leading-none text-white">
                          {count > 9 ? '9+' : count}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate">{label}</span>
                        <NavBadge count={count} />
                      </>
                    )}
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
  onToggleCollapse,
}: {
  isCollapsed?: boolean
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
  onToggleCollapse?: () => void
}) {
  const { logout } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (isMobile && isOpen) onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const shellClass =
    'flex h-full w-full flex-col text-white bg-[linear-gradient(180deg,var(--brand-950),var(--brand-900))]'

  const iconBtn = (active?: boolean) =>
    cn(
      'flex h-9 w-9 items-center justify-center rounded-lg touch-manipulation transition-colors duration-150',
      active
        ? 'bg-brand-600 text-white shadow-sm'
        : 'text-white/70 hover:bg-white/15 hover:text-white active:bg-white/20'
    )

  const content = (
    <>
      <div
        className={cn(
          'flex h-12 shrink-0 items-center',
          isCollapsed ? 'justify-center px-0' : 'justify-between gap-1 px-2'
        )}
      >
        {!isCollapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/95 font-display text-xs font-bold text-brand-600 shadow-sm">
              S
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-sm font-bold text-white">SnagDesk</p>
              <p className="truncate text-[9px] text-white/40">by Buildesk</p>
            </div>
          </div>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/15"
            aria-label="Close menu"
          >
            <X size={18} aria-hidden />
          </button>
        )}
        {!isMobile && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={iconBtn()}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronsRight size={18} aria-hidden /> : <ChevronsLeft size={18} aria-hidden />}
          </button>
        )}
      </div>

      <SidebarNav isCollapsed={isCollapsed} onNavigate={onClose} />

      <div
        className={cn(
          'shrink-0 border-t border-white/10 pb-safe',
          isCollapsed ? 'flex flex-col items-center gap-1 p-1.5' : 'space-y-0.5 p-1.5'
        )}
      >
        <NavLink
          to={ROUTES.PROFILE}
          onClick={onClose}
          title="My Profile"
          className={({ isActive }) =>
            isCollapsed
              ? iconBtn(isActive)
              : cn(
                  'flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium touch-manipulation',
                  isActive
                    ? 'bg-brand-600/25 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )
          }
        >
          <UserCircle size={18} className="shrink-0" aria-hidden />
          {!isCollapsed && <span className="truncate">Profile</span>}
        </NavLink>

        <button
          type="button"
          onClick={logout}
          title="Logout"
          className={
            isCollapsed
              ? cn(iconBtn(), 'text-danger-100/80 hover:bg-danger-600/25 hover:text-white')
              : cn(
                  'flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-danger-100/80 touch-manipulation',
                  'hover:bg-danger-600/20 hover:text-white'
                )
          }
        >
          <LogOut size={18} className="shrink-0" aria-hidden />
          {!isCollapsed && <span className="truncate">Logout</span>}
        </button>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            'fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          onClick={onClose}
          aria-hidden
        />
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-[min(78%,220px)] shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden',
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

  return <aside className={shellClass}>{content}</aside>
}
