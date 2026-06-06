import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { notificationsApi } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import { ROUTES } from '../../constants/routes'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { cn } from '../../utils/cn'
import { formatDistanceToNow, format } from 'date-fns'
import type { Notification } from '../../types'
import toast from 'react-hot-toast'

function notificationRoute(n: Notification, role: string): string {
  const id = n.relatedId
  switch (n.type) {
    case 'revision_required':
    case 'inspection_rejected':
      if (role === 'engineer') return `/engineer/flats/${id}/categories`
      return ROUTES.QA_REVIEW_DETAIL(id)
    case 'inspection_submitted':
      return ROUTES.QA_REVIEW_DETAIL(id)
    case 'inspection_approved':
      return ROUTES.ENGINEER_INSPECTION_SUMMARY(id)
    case 'snag_assigned':
    case 'snag_rectified':
      return ROUTES.DESNAGGING_DETAIL(id)
    default:
      if (role === 'engineer') return ROUTES.ENGINEER_FLATS
      if (role === 'qa') return ROUTES.QA_REVIEWS
      return ROUTES.ADMIN
  }
}

function notificationIcon(type: string): string {
  switch (type) {
    case 'inspection_approved':   return '✅'
    case 'revision_required':     return '🔄'
    case 'inspection_rejected':   return '❌'
    case 'inspection_submitted':  return '📋'
    case 'snag_assigned':         return '🔧'
    case 'snag_rectified':        return '✔️'
    default:                      return '🔔'
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { notifications, refresh } = useNotifications()

  const handleTap = async (n: Notification) => {
    if (!n.isRead) {
      await notificationsApi.markRead(n.id).catch(() => {})
      await refresh()
    }
    navigate(notificationRoute(n, user?.role || 'engineer'))
  }

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => toast.error('Failed to mark all read'))
    await refresh()
    toast.success('All notifications marked as read')
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Show spinner only when notifications haven't loaded yet (initial state)
  if (notifications.length === 0 && unreadCount === 0) {
    // Could be loading or genuinely empty — EmptyState handles both below
  }

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
              className={cn(
                'w-full rounded-2xl border text-left touch-manipulation',
                'active:scale-[0.99] transition-transform',
                // Ensure good tap target height on Android
                'min-h-[72px]',
                n.isRead
                  ? 'border-slate-200 bg-white'
                  : 'border-primary/20 bg-primary/5 shadow-sm'
              )}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Emoji icon — larger, no font-size issues on Android */}
                <div className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl',
                  n.isRead ? 'bg-slate-100' : 'bg-primary/10'
                )}>
                  <span aria-hidden="true">{notificationIcon(n.type)}</span>
                </div>

                {/* Content */}
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

                  {/* Time — relative on mobile, absolute on hover/large screens */}
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
