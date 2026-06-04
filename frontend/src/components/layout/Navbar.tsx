import { Bell, Menu } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useInspectionUiStore } from '../../store/inspectionUiStore'
import { Avatar } from '../ui/Avatar'
import { useLocation } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { cn } from '../../utils/cn'

const pageTitles: Record<string, string> = {
  [ROUTES.ADMIN]: 'Admin Dashboard',
  [ROUTES.ADMIN_PROJECTS]: 'Projects',
  [ROUTES.ADMIN_USERS]: 'Users',
  [ROUTES.ADMIN_TEMPLATES]: 'Templates',
  [ROUTES.ADMIN_REPORTS]: 'Reports',
  [ROUTES.ENGINEER_DASHBOARD]: 'Dashboard',
  [ROUTES.ENGINEER_FLATS]: 'My Flats',
  [ROUTES.QA_DASHBOARD]: 'QA Dashboard',
  [ROUTES.QA_REVIEWS]: 'Pending Reviews',
  [ROUTES.QA_HISTORY]: 'Review History',
  [ROUTES.DESNAGGING]: 'De-Snagging',
}

function getPageTitle(pathname: string): string {
  if (pathname.includes('/checklist')) return 'Fill Checklist'
  if (pathname.includes('/inspection-summary')) return 'Inspection Summary'
  if (pathname.match(/\/engineer\/flats\/[^/]+$/)) return 'Flat Details'
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname === route || pathname.startsWith(route + '/')) return title
  }
  return 'SnagDesk'
}

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const user = useAuthStore((s) => s.user)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const saveState = useInspectionUiStore((s) => s.saveState)
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)
  const isChecklist = location.pathname.includes('/checklist')

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-4 md:h-16">
      <div className="md:hidden">
        <button
          type="button"
          className="-ml-2 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="hidden md:flex">
        <h1 className="text-xl font-bold text-slate-900">{pageTitle}</h1>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
        <h1 className="text-center text-lg font-bold text-slate-900">
          {isChecklist ? 'Checklist' : 'SnagDesk'}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isChecklist && saveState !== 'idle' && (
          <span
            className={cn(
              'mr-1 text-xs font-semibold',
              saveState === 'saving' ? 'text-primary' : 'text-pass'
            )}
          >
            {saveState === 'saving' ? 'Saving…' : 'Saved'}
          </span>
        )}

        <button
          type="button"
          className="relative flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-fail text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="flex h-11 w-11 items-center justify-center rounded-full" aria-label="User profile">
          <Avatar name={user?.name || 'User'} size="sm" />
        </div>
      </div>
    </header>
  )
}
