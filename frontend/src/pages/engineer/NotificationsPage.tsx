import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { CheckCheck, ChevronRight } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { notificationsApi } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { resolveNotificationRoute, warmRouteData } from '../../utils/notificationNavigation'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay } from 'date-fns'
import type { Notification } from '../../types'
import toast from 'react-hot-toast'

function notificationIcon(type: string): string {
  switch (type) {
    case 'inspection_approved':
      return '✅'
    case 'revision_required':
    case 'qa_task_revision':
      return '🔄'
    case 'inspection_rejected':
    case 'qa_task_rejected':
      return '❌'
    case 'inspection_submitted':
      return '📋'
    case 'inspection_started':
      return '▶️'
    case 'inspection_resumed':
      return '⏩'
    case 'qa_review_started':
      return '👀'
    case 'qa_review_resumed':
      return '🔍'
    case 'snag_assigned':
      return '🔧'
    case 'snag_rectified':
      return '✔️'
    case 'flat_completion':
      return '🎯'
    default:
      return '🔔'
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
  const [openingId, setOpeningId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, Notification[]>()
    for (const n of notifications) {
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
  }, [notifications])

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

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const emptyHint =
    user?.role === 'qa'
      ? 'You will be notified when engineers start or resume flats.'
      : user?.role === 'engineer'
      ? 'You will be notified when QA reviews your flats.'
      : 'Activity alerts for the project will appear here.'

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-h2 text-ink-950">Notifications</h1>
          {unreadCount > 0 && (
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-danger-600 px-1.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAll} className="shrink-0">
            <CheckCheck size={16} aria-hidden="true" />
            Mark all read
          </Button>
        )}
      </div>

      {openingId && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-600">
          <Spinner size="sm" />
          Loading page data…
        </div>
      )}

      {loading && notifications.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications" description={emptyHint} />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.key}>
              <h2 className="mb-2 text-label uppercase tracking-wide text-ink-400">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleTap(n)}
                    disabled={!!openingId}
                    className="w-full text-left touch-manipulation"
                  >
                    <Card
                      className={cn(
                        'relative overflow-hidden transition-transform active:scale-[0.99]',
                        openingId === n.id && 'opacity-70',
                        !n.isRead && 'border-brand-200 bg-brand-50/50'
                      )}
                    >
                      {!n.isRead && (
                        <span className="absolute left-0 top-0 h-full w-1 bg-brand-500" aria-hidden />
                      )}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl',
                            n.isRead ? 'bg-ink-100' : 'bg-brand-100'
                          )}
                        >
                          <span aria-hidden="true">{notificationIcon(n.type)}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'text-sm font-semibold leading-snug',
                              n.isRead ? 'text-ink-700' : 'text-ink-950'
                            )}
                          >
                            {n.title}
                            {!n.isRead && (
                              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-brand-500 align-middle" />
                            )}
                          </p>

                          {n.message && (
                            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-ink-500">
                              {n.message}
                            </p>
                          )}

                          <p className="mt-1 text-caption text-ink-400">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            <span className="hidden sm:inline">
                              {' · '}
                              {format(new Date(n.createdAt), 'dd MMM yyyy, h:mm a')}
                            </span>
                          </p>
                        </div>

                        <ChevronRight
                          size={16}
                          className="shrink-0 text-ink-300"
                          aria-hidden="true"
                        />
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
