import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCheck, ChevronRight, Bell, BellRing, CheckCircle2,
  RotateCcw, XCircle, ClipboardList, Play, FastForward,
  Eye, Search, Wrench, Check, Target, type LucideIcon,
} from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { notificationsApi } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { resolveNotificationRoute, warmRouteData } from '../../utils/notificationNavigation'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay } from 'date-fns'
import type { Notification } from '../../types'
import toast from 'react-hot-toast'

type FilterKey = 'all' | 'unread' | 'read'

const easeOut = [0.22, 1, 0.36, 1] as const
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'

function iconForType(type: string): { Icon: LucideIcon; color: string } {
  switch (type) {
    case 'inspection_approved':
      return { Icon: CheckCircle2, color: 'text-success-600 bg-success-100' }
    case 'revision_required':
    case 'qa_task_revision':
      return { Icon: RotateCcw, color: 'text-warning-600 bg-warning-100' }
    case 'inspection_rejected':
    case 'qa_task_rejected':
      return { Icon: XCircle, color: 'text-danger-600 bg-danger-100' }
    case 'inspection_submitted':
      return { Icon: ClipboardList, color: 'text-brand-600 bg-brand-100' }
    case 'inspection_started':
      return { Icon: Play, color: 'text-brand-600 bg-brand-100' }
    case 'inspection_resumed':
      return { Icon: FastForward, color: 'text-brand-600 bg-brand-100' }
    case 'qa_review_started':
      return { Icon: Eye, color: 'text-brand-600 bg-brand-100' }
    case 'qa_review_resumed':
      return { Icon: Search, color: 'text-brand-600 bg-brand-100' }
    case 'snag_assigned':
      return { Icon: Wrench, color: 'text-warning-600 bg-warning-100' }
    case 'snag_rectified':
      return { Icon: Check, color: 'text-success-600 bg-success-100' }
    case 'flat_completion':
      return { Icon: Target, color: 'text-accent-500 bg-accent-100' }
    default:
      return { Icon: Bell, color: 'text-ink-600 bg-ink-100' }
  }
}

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'dd MMM yyyy')
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const fetchCount = useNotificationStore((s) => s.fetchCount)
  const { notifications, refresh, loading } = useNotifications()
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const readCount = notifications.length - unreadCount

  const visible = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead)
    if (filter === 'read') return notifications.filter((n) => n.isRead)
    return notifications
  }, [notifications, filter])

  const grouped = useMemo(() => {
    const map = new Map<string, Notification[]>()
    for (const n of visible) {
      const d = startOfDay(new Date(n.createdAt))
      const key = d.toISOString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(n)
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: dayLabel(new Date(key)),
      items,
    }))
  }, [visible])

  const selectFilter = (key: FilterKey) => {
    setFilter((prev) => (prev === key ? 'all' : key))
  }

  const handleTap = async (n: Notification) => {
    if (openingId) return

    if (!n.isRead) {
      await notificationsApi.markRead(n.id).catch(() => {})
      await refresh()
      fetchCount()
    }

    setOpeningId(n.id)
    try {
      const route = await resolveNotificationRoute(n, user?.role || 'engineer')
      await warmRouteData(route)
      navigate(route)
    } catch {
      toast.error('Could not open this notification')
    } finally {
      setOpeningId(null)
    }
  }

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => toast.error('Failed to mark all read'))
    await refresh()
    fetchCount()
    toast.success('All notifications marked as read')
  }

  const emptyHint =
    user?.role === 'qa'
      ? 'You will be notified when engineers start or resume flats.'
      : user?.role === 'engineer'
        ? 'You will be notified when QA reviews your flats.'
        : 'Activity alerts for the project will appear here.'

  let itemIndex = 0

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Notifications</h1>
          <p className="text-[11px] text-ink-400">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            {' · '}
            {notifications.length} total
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAll}
            className={cn(compactBtn, 'shrink-0')}
          >
            <CheckCheck size={13} aria-hidden="true" />
            <span className="sm:hidden">Read all</span>
            <span className="hidden sm:inline">Mark all read</span>
          </Button>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            index={0}
            label="Total"
            value={notifications.length}
            icon={Bell}
            selected={filter === 'all'}
            onClick={() => selectFilter('all')}
          />
          <StatCard
            index={1}
            label="Unread"
            value={unreadCount}
            icon={BellRing}
            colorClass="text-brand-600 bg-brand-100"
            selected={filter === 'unread'}
            onClick={() => selectFilter('unread')}
          />
          <StatCard
            index={2}
            label="Read"
            value={readCount}
            icon={CheckCheck}
            colorClass="text-success-600 bg-success-100"
            selected={filter === 'read'}
            onClick={() => selectFilter('read')}
          />
        </div>
      )}

      <AnimatePresence initial={false}>
        {openingId && (
          <motion.div
            key="loading"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-xs font-medium text-brand-600">
              <Spinner size="sm" />
              Opening…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && notifications.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications" description={emptyHint} className="py-10" />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Nothing in this filter."
          actionLabel="Show all"
          onAction={() => setFilter('all')}
          className="py-10"
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={filter}
            className="space-y-3"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            {grouped.map((group) => (
              <section key={group.key}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h2 className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                    {group.label}
                  </h2>
                  <span className="text-[11px] tabular text-ink-400">{group.items.length}</span>
                </div>
                <div className="space-y-1.5">
                  {group.items.map((n) => {
                    const i = itemIndex++
                    const { Icon, color } = iconForType(n.type)
                    return (
                      <motion.div
                        key={n.id}
                        layout={!reduced}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={stagger(Math.min(i, 12))}
                      >
                        <button
                          type="button"
                          onClick={() => handleTap(n)}
                          disabled={!!openingId}
                          className="w-full text-left touch-manipulation"
                        >
                          <Card
                            className={cn(
                              'relative overflow-hidden shadow-xs transition-all duration-fast',
                              'hover:border-brand-200 hover:shadow-sm active:scale-[0.99]',
                              openingId === n.id && 'opacity-70',
                              !n.isRead && 'border-brand-200/80 bg-brand-50/30'
                            )}
                          >
                            {!n.isRead && (
                              <span
                                className="absolute inset-y-0 left-0 w-0.5 bg-brand-500"
                                aria-hidden
                              />
                            )}
                            <div className="flex items-center gap-2.5 px-3 py-2.5 pl-3">
                              <div
                                className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                  color
                                )}
                              >
                                <Icon size={15} aria-hidden="true" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    'truncate text-sm font-semibold leading-snug',
                                    n.isRead ? 'text-ink-700' : 'text-ink-950'
                                  )}
                                >
                                  {n.title}
                                  {!n.isRead && (
                                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-500 align-middle" />
                                  )}
                                </p>

                                {n.message && (
                                  <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-ink-400">
                                    {n.message}
                                  </p>
                                )}

                                <p className="mt-0.5 text-[10px] text-ink-400">
                                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                  <span className="hidden sm:inline">
                                    {' · '}
                                    {format(new Date(n.createdAt), 'dd MMM, h:mm a')}
                                  </span>
                                </p>
                              </div>

                              <ChevronRight
                                size={14}
                                className="shrink-0 text-ink-300"
                                aria-hidden="true"
                              />
                            </div>
                          </Card>
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
