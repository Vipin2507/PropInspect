import { Bell, Menu } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useInspectionUiStore } from '../../store/inspectionUiStore'
import { Avatar } from '../ui/Avatar'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { cn } from '../../utils/cn'

const pageTitles: Record<string, string> = {
  [ROUTES.ADMIN]:              'Admin Dashboard',
  [ROUTES.ADMIN_PROJECTS]:     'Projects',
  [ROUTES.ADMIN_USERS]:        'Users',
  [ROUTES.ADMIN_TEMPLATES]:    'Templates',
  [ROUTES.ADMIN_REPORTS]:      'Reports',
  [ROUTES.ADMIN_MONITORING]:   'Flat Monitoring',
  [ROUTES.ENGINEER_DASHBOARD]: 'Dashboard',
  [ROUTES.ENGINEER_FLATS]:     'Flats',
  [ROUTES.ENGINEER_NOTIFICATIONS]: 'Notifications',
  [ROUTES.QA_DASHBOARD]:       'QA Dashboard',
  [ROUTES.QA_REVIEWS]:         'Pending Reviews',
  [ROUTES.QA_HISTORY]:         'Review History',
  [ROUTES.DESNAGGING]:         'De-Snagging',
  [ROUTES.PROFILE]:            'My Profile',
}

function getPageTitle(pathname: string): string {
  if (pathname.includes('/checklist'))          return 'Checklist'
  if (pathname.includes('/inspection-summary')) return 'Inspection Summary'
  if (pathname.endsWith('/snags'))              return 'Open Snags'
  if (pathname.match(/\/engineer\/flats\/[^/]+$/)) return 'Flat Details'
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname === route || pathname.startsWith(route + '/')) return title
  }
  return 'SnagDesk'
}

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const user        = useAuthStore((s) => s.user)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const saveState   = useInspectionUiStore((s) => s.saveState)
  const location    = useLocation()
  const navigate    = useNavigate()
  const pageTitle   = getPageTitle(location.pathname)
  const isChecklist = location.pathname.includes('/checklist')

  const handleBellClick = () => {
    navigate(ROUTES.ENGINEER_NOTIFICATIONS)
  }

  return (
    /*
     * No fixed h-14 — the header grows naturally.
     * padding-top: safe-area-inset-top pushes content below the status bar.
     * padding-right: safe-area-inset-right prevents clipping on notched devices.
     */
    <header
      className="relative z-20 shrink-0 border-b border-slate-200 bg-white md:px-4"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* ── Mobile layout ── */}
      <div className="flex h-14 w-full items-center px-2 md:hidden">

        {/* Left — hamburger */}
        <div className="flex w-12 shrink-0 items-center">
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Center — title */}
        <div className="flex flex-1 items-center justify-center overflow-hidden px-2">
          <h1 className="text-base font-bold text-slate-900 truncate text-center">
            {isChecklist ? 'Checklist' : getPageTitle(location.pathname)}
          </h1>
        </div>

        {/* Right — save + bell + avatar */}
        <div className="flex shrink-0 items-center justify-end gap-0.5">
          {isChecklist && saveState !== 'idle' && (
            <span className={cn(
              'text-xs font-semibold px-1',
              saveState === 'saving' ? 'text-primary' : 'text-pass'
            )}>
              {saveState === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}

          <button
            type="button"
            onClick={handleBellClick}
            className="relative flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={20} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-fail text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.PROFILE)}
            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full active:bg-slate-100"
            aria-label="My profile"
          >
            <Avatar name={user?.name || 'User'} size="sm" />
          </button>
        </div>
      </div>

      {/* ── Desktop layout (md+) ── */}
      <div className="hidden h-16 w-full items-center md:flex">
        <h1 className="text-xl font-bold text-slate-900">{getPageTitle(location.pathname)}</h1>

        <div className="ml-auto flex items-center gap-1">
          {isChecklist && saveState !== 'idle' && (
            <span className={cn(
              'mr-1 text-xs font-semibold',
              saveState === 'saving' ? 'text-primary' : 'text-pass'
            )}>
              {saveState === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}

          <button
            type="button"
            onClick={handleBellClick}
            className="relative flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={22} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-fail text-[10px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.PROFILE)}
            className="flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center rounded-full active:bg-slate-100"
            aria-label="My profile"
          >
            <Avatar name={user?.name || 'User'} size="sm" />
          </button>
        </div>
      </div>

    </header>
  )
}
