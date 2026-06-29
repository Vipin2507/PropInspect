import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { notificationsApi } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import { resolveNotificationRoute, warmRouteData } from '../../utils/notificationNavigation'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import { formatDistanceToNow, format } from 'date-fns'
import type { Notification } from '../../types'
import toast from 'react-hot-toast'

function notificationIcon(type: string): string {
  switch (type) {
    case 'inspection_approved':   return '✅'
    case 'revision_required':     return '🔄'
    case 'inspection_rejected':   return '❌'
    case 'inspection_submitted':  return '📋'
    case 'snag_assigned':         return '🔧'
    case 'snag_rectified':        return '✔️'
    case 'flat_completion':       return '🎯'
    default:                      return '🔔'
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { notifications, refresh } = useNotifications()
  const [openingId, setOpeningId] = useState<string | null>(null)

  const handleTap = async (n: Notification) => {
    if (openingId) return

    if (!n.isRead) {
      await notificationsApi.markRead(n.id).catch(() => {})
      await refresh()
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
    toast.success('All notifications marked as read')
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Notifications</h1>
          {unreadCount > 0 && (
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-fail px-1.5 text-xs font-bold text-white">
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
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2 text-sm text-primary">
          <Spinner size="sm" />
          Loading page data…
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="You're all caught up! Notifications will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleTap(n)}
              disabled={!!openingId}
              className={cn(
                'w-full rounded-2xl border text-left touch-manipulation',
                'active:scale-[0.99] transition-transform',
                'min-h-[72px]',
                openingId === n.id && 'opacity-70',
                n.isRead
                  ? 'border-slate-200 bg-white'
                  : 'border-primary/20 bg-primary/5 shadow-sm'
              )}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl',
                  n.isRead ? 'bg-slate-100' : 'bg-primary/10'
                )}>
                  <span aria-hidden="true">{notificationIcon(n.type)}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      'text-sm font-semibold leading-snug',
                      n.isRead ? 'text-slate-700' : 'text-slate-900'
                    )}>
                      {n.title}
                      {!n.isRead && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
                      )}
                    </p>
                  </div>

                  {n.message && (
                    <p className="mt-0.5 text-sm text-slate-500 line-clamp-2 leading-snug">
                      {n.message}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-slate-400">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    <span className="hidden sm:inline">
                      {' · '}{format(new Date(n.createdAt), 'dd MMM yyyy, h:mm a')}
                    </span>
                  </p>
                </div>

                <ChevronRight size={16} className="shrink-0 text-slate-300" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
