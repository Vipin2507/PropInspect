import { Bell, Menu, LogOut, User } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useInspectionUiStore } from '../../store/inspectionUiStore'
import { Avatar } from '../ui/Avatar'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { cn } from '../../utils/cn'

const pageTitles: Record<string, string> = {
  [ROUTES.ADMIN]: 'Admin Dashboard',
  [ROUTES.ADMIN_PROJECTS]: 'Projects',
  [ROUTES.ADMIN_USERS]: 'Users',
  [ROUTES.ADMIN_TEMPLATES]: 'Templates',
  [ROUTES.ADMIN_REPORTS]: 'Reports',
  [ROUTES.ADMIN_MONITORING]: 'Flat Monitoring',
  [ROUTES.ENGINEER_DASHBOARD]: 'Dashboard',
  [ROUTES.ENGINEER_FLATS]: 'Flats',
  [ROUTES.ENGINEER_NOTIFICATIONS]: 'Notifications',
  [ROUTES.QA_DASHBOARD]: 'QA Dashboard',
  [ROUTES.QA_REVIEWS]: 'Pending Reviews',
  [ROUTES.QA_HISTORY]: 'Review History',
  [ROUTES.DESNAGGING]: 'De-Snagging',
  [ROUTES.PROFILE]: 'My Profile',
}

function getPageTitle(pathname: string): string {
  if (pathname.includes('/checklist')) return 'Checklist'
  if (pathname.includes('/inspection-summary')) return 'Inspection Summary'
  if (pathname.endsWith('/snags')) return 'Open Snags'
  if (pathname.match(/\/engineer\/flats\/[^/]+$/)) return 'Flat Details'
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname === route || pathname.startsWith(route + '/')) return title
  }
  return 'SnagDesk'
}

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const saveState = useInspectionUiStore((s) => s.saveState)
  const location = useLocation()
  const navigate = useNavigate()
  const isChecklist = location.pathname.includes('/checklist')
  const title = isChecklist ? 'Checklist' : getPageTitle(location.pathname)

  return (
    <header
      className="relative z-20 shrink-0 border-b border-ink-100 bg-white/80 backdrop-blur-md md:px-4"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="flex h-14 w-full items-center px-2 md:hidden">
        <div className="flex w-12 shrink-0 items-center">
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full text-ink-600 hover:bg-ink-100 active:bg-ink-100 focus-visible:ring-4 focus-visible:ring-brand-100"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu size={24} aria-hidden />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden px-2">
          <h1 className="truncate text-center font-display text-base font-bold text-ink-950">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-0.5">
          {isChecklist && saveState !== 'idle' && (
            <span
              className={cn(
                'px-1 text-xs font-semibold',
                saveState === 'saving' ? 'text-brand-600' : 'text-success-600'
              )}
            >
              {saveState === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}

          <button
            type="button"
            onClick={() => navigate(ROUTES.ENGINEER_NOTIFICATIONS)}
            className="relative flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full text-ink-600 hover:bg-ink-100 focus-visible:ring-4 focus-visible:ring-brand-100"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={20} aria-hidden />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-600 ring-2 ring-white" />
            )}
          </button>

          <AvatarMenu
            name={user?.name || 'User'}
            role={user?.role}
            onProfile={() => navigate(ROUTES.PROFILE)}
            onLogout={logout}
          />
        </div>
      </div>

      <div className="hidden h-16 w-full items-center md:flex">
        <h1 className="font-display text-display text-ink-950">{getPageTitle(location.pathname)}</h1>

        <div className="ml-auto flex items-center gap-1">
          {isChecklist && saveState !== 'idle' && (
            <span
              className={cn(
                'mr-1 text-xs font-semibold',
                saveState === 'saving' ? 'text-brand-600' : 'text-success-600'
              )}
            >
              {saveState === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}

          <button
            type="button"
            onClick={() => navigate(ROUTES.ENGINEER_NOTIFICATIONS)}
            className="relative flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center rounded-full text-ink-600 hover:bg-ink-100 focus-visible:ring-4 focus-visible:ring-brand-100"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={22} aria-hidden />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-danger-600 ring-2 ring-white" />
            )}
          </button>

          <AvatarMenu
            name={user?.name || 'User'}
            role={user?.role}
            onProfile={() => navigate(ROUTES.PROFILE)}
            onLogout={logout}
          />
        </div>
      </div>
    </header>
  )
}

function AvatarMenu({
  name,
  role,
  onProfile,
  onLogout,
}: {
  name: string
  role?: string
  onProfile: () => void
  onLogout: () => void
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full hover:bg-ink-100 focus-visible:ring-4 focus-visible:ring-brand-100 md:min-h-[48px] md:min-w-[48px]"
          aria-label="Account menu"
        >
          <Avatar name={name} size="sm" role={role} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[180px] overflow-hidden rounded-lg border border-ink-100 bg-white p-1 shadow-md"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-ink-800 outline-none data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700"
            onSelect={onProfile}
          >
            <User size={16} aria-hidden />
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-danger-600 outline-none data-[highlighted]:bg-danger-100"
            onSelect={onLogout}
          >
            <LogOut size={16} aria-hidden />
            Logout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
