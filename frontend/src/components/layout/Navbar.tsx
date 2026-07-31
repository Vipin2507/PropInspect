import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Menu, LogOut, User } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useInspectionUiStore } from '../../store/inspectionUiStore'
import { Avatar } from '../ui/Avatar'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'

const easeOut = [0.22, 1, 0.36, 1] as const

const pageTitles: Record<string, string> = {
  [ROUTES.ADMIN]: 'Dashboard',
  [ROUTES.ADMIN_PROJECTS]: 'Projects',
  [ROUTES.ADMIN_USERS]: 'Users',
  [ROUTES.ADMIN_TEMPLATES]: 'Templates',
  [ROUTES.ADMIN_REPORTS]: 'Reports',
  [ROUTES.ADMIN_MONITORING]: 'Monitoring',
  [ROUTES.ADMIN_ACTIVITY]: 'Activity',
  [ROUTES.ADMIN_NOTIF_SETTINGS]: 'Notifications',
  [ROUTES.ENGINEER_DASHBOARD]: 'Dashboard',
  [ROUTES.ENGINEER_FLATS]: 'All Flats',
  [ROUTES.ENGINEER_NOTIFICATIONS]: 'Notifications',
  [ROUTES.ENGINEER_CHANGES]: 'QA Feedback',
  [ROUTES.QA_DASHBOARD]: 'Dashboard',
  [ROUTES.QA_REVIEWS]: 'Reviews',
  [ROUTES.QA_HISTORY]: 'History',
  [ROUTES.QA_ALL_FLATS]: 'All Flats',
  [ROUTES.QA_CHANGES]: 'QA Changes',
  [ROUTES.DESNAGGING]: 'De-Snagging',
  [ROUTES.PROFILE]: 'Profile',
}

function getPageTitle(pathname: string): string {
  if (pathname.includes('/checklist')) return 'Checklist'
  if (pathname.includes('/inspection-summary')) return 'Summary'
  if (pathname.endsWith('/snags')) return 'Open Snags'
  if (pathname.match(/\/engineer\/flats\/[^/]+$/)) return 'Flat Details'
  if (pathname.match(/\/qa\/reviews\/[^/]+$/)) return 'Review'
  if (pathname.match(/\/admin\/projects\/[^/]+\/towers\/[^/]+$/)) return 'Tower'
  if (pathname.match(/\/admin\/projects\/[^/]+\/flats$/)) return 'Flats'
  if (pathname.match(/\/admin\/projects\/[^/]+$/)) return 'Project'
  if (pathname.match(/\/desnagging\/[^/]+$/)) return 'Snag Detail'

  let best = 'SnagDesk'
  let bestLen = -1
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      if (route.length > bestLen) {
        best = title
        bestLen = route.length
      }
    }
  }
  return best
}

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const saveState = useInspectionUiStore((s) => s.saveState)
  const location = useLocation()
  const navigate = useNavigate()
  const { reduced } = useMotionSafe()
  const isChecklist = location.pathname.includes('/checklist')
  const title = isChecklist ? 'Checklist' : getPageTitle(location.pathname)

  return (
    <header
      className="relative z-20 shrink-0 border-b border-ink-100/80 bg-surface/85 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]"
    >
      {/* Mobile */}
      <div className="flex h-12 w-full items-center pl-[max(0.375rem,env(safe-area-inset-left,0px))] pr-[max(0.375rem,env(safe-area-inset-right,0px))] md:hidden">
        <div className="flex w-11 shrink-0 items-center">
          <button
            type="button"
            className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-md text-ink-600 transition-colors duration-fast hover:bg-ink-50 active:bg-ink-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden px-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={title}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: easeOut }}
              className="truncate text-center font-display text-sm font-bold text-ink-950"
            >
              {title}
            </motion.h1>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-0.5">
          <SaveIndicator saveState={saveState} show={isChecklist} reduced={reduced} />
          <NotifButton
            unreadCount={unreadCount}
            onClick={() => navigate(ROUTES.ENGINEER_NOTIFICATIONS)}
            reduced={reduced}
            compact
          />
          <AvatarMenu
            name={user?.name || 'User'}
            role={user?.role}
            onProfile={() => navigate(ROUTES.PROFILE)}
            onLogout={logout}
          />
        </div>
      </div>

      {/* Desktop — align with main content padding */}
      <div className="hidden h-14 w-full items-center px-5 md:flex lg:px-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={title}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: easeOut }}
            className="font-display text-lg font-bold text-ink-950"
          >
            {title}
          </motion.h1>
        </AnimatePresence>

        <div className="ml-auto flex items-center gap-1">
          <SaveIndicator saveState={saveState} show={isChecklist} reduced={reduced} />
          <NotifButton
            unreadCount={unreadCount}
            onClick={() => navigate(ROUTES.ENGINEER_NOTIFICATIONS)}
            reduced={reduced}
          />
          <AvatarMenu
            name={user?.name || 'User'}
            role={user?.role}
            onProfile={() => navigate(ROUTES.PROFILE)}
            onLogout={logout}
            showName
          />
        </div>
      </div>
    </header>
  )
}

function SaveIndicator({
  saveState,
  show,
  reduced,
}: {
  saveState: 'idle' | 'saving' | 'saved'
  show: boolean
  reduced: boolean
}) {
  if (!show || saveState === 'idle') return null
  return (
    <AnimatePresence>
      <motion.span
        key={saveState}
        initial={reduced ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.28, ease: easeOut }}
        className={cn(
          'mr-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
          saveState === 'saving'
            ? 'bg-brand-50 text-brand-600'
            : 'bg-success-50 text-success-600'
        )}
      >
        {saveState === 'saving' ? 'Saving…' : 'Saved'}
      </motion.span>
    </AnimatePresence>
  )
}

function NotifButton({
  unreadCount,
  onClick,
  reduced,
  compact,
}: {
  unreadCount: number
  onClick: () => void
  reduced: boolean
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex touch-manipulation items-center justify-center rounded-md text-ink-600 transition-colors duration-fast',
        'hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
        compact ? 'h-10 w-10' : 'h-10 w-10'
      )}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell size={compact ? 18 : 20} aria-hidden />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            key="dot"
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? undefined : { scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-600 ring-2 ring-surface"
          />
        )}
      </AnimatePresence>
    </button>
  )
}

function AvatarMenu({
  name,
  role,
  onProfile,
  onLogout,
  showName,
}: {
  name: string
  role?: string
  onProfile: () => void
  onLogout: () => void
  showName?: boolean
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex touch-manipulation items-center gap-2 rounded-md transition-colors duration-fast',
            'hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
            showName ? 'h-10 pl-1.5 pr-2.5' : 'h-10 w-10 justify-center'
          )}
          aria-label="Account menu"
        >
          <Avatar name={name} size="sm" role={role} />
          {showName && (
            <span className="hidden max-w-[120px] truncate text-xs font-semibold text-ink-700 lg:inline">
              {name.split(' ')[0]}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[168px] overflow-hidden rounded-lg border border-ink-100 bg-surface p-1 shadow-md data-[state=open]:animate-in"
        >
          <div className="border-b border-ink-50 px-2.5 py-2">
            <p className="truncate text-xs font-semibold text-ink-900">{name}</p>
            {role && (
              <p className="mt-0.5 text-[10px] font-medium capitalize text-ink-400">{role}</p>
            )}
          </div>
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-ink-700 outline-none data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700"
            onSelect={onProfile}
          >
            <User size={14} aria-hidden />
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-danger-600 outline-none data-[highlighted]:bg-danger-50"
            onSelect={onLogout}
          >
            <LogOut size={14} aria-hidden />
            Logout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
