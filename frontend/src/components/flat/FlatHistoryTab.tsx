import { format, formatDistanceToNow } from 'date-fns'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  RotateCcw,
  Send,
  UserPlus,
  XCircle,
} from 'lucide-react'
import type { FlatHistoryEntry, FlatHistoryEventType } from '../../types'
import { cn } from '../../utils/cn'
import { Spinner } from '../ui/Spinner'
import { EmptyState } from '../ui/EmptyState'

const EVENT_CONFIG: Record<
  FlatHistoryEventType,
  { icon: typeof Send; color: string; bg: string; border: string }
> = {
  inspection_started: {
    icon: ClipboardList,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  inspection_submitted: {
    icon: Send,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  inspection_resubmitted: {
    icon: RotateCcw,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  inspection_resumed: {
    icon: RotateCcw,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  review_approved: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  review_rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  review_revision_required: {
    icon: AlertCircle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  qa_review_started: {
    icon: ClipboardList,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  qa_review_resumed: {
    icon: RotateCcw,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  qa_task_revision: {
    icon: RotateCcw,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  qa_task_rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  qa_task_approved: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  handed_over: {
    icon: PackageCheck,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  engineer_assigned: {
    icon: UserPlus,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
  status_changed: {
    icon: AlertCircle,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
}

function roleLabel(role?: string) {
  if (!role) return ''
  if (role === 'qa') return 'QA Checker'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function FlatHistoryTab({
  history,
  loading,
  error,
}: {
  history: FlatHistoryEntry[]
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <EmptyState
        title="No history yet"
        description="Events like submissions, QA reviews, and handovers will appear here."
      />
    )
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
      <h2 className="mb-4 text-base font-bold text-slate-800 md:text-lg">Flat History</h2>
      <ol className="relative space-y-0">
        {history.map((entry, index) => {
          const cfg = EVENT_CONFIG[entry.eventType] ?? EVENT_CONFIG.status_changed
          const Icon = cfg.icon
          const isLast = index === history.length - 1
          const when = entry.createdAt ? new Date(entry.createdAt) : null
          const whenValid = when && !Number.isNaN(when.getTime())

          return (
            <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-5 top-10 h-[calc(100%-1.25rem)] w-px bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                  cfg.bg,
                  cfg.border,
                  cfg.color
                )}
              >
                <Icon size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{entry.title}</p>
                  {whenValid && (
                    <time
                      className="shrink-0 text-xs text-slate-400"
                      dateTime={entry.createdAt}
                      title={format(when, 'PPpp')}
                    >
                      {formatDistanceToNow(when, { addSuffix: true })}
                    </time>
                  )}
                </div>
                {entry.actorName && (
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {entry.actorName}
                    {entry.actorRole ? ` · ${roleLabel(entry.actorRole)}` : ''}
                  </p>
                )}
                {entry.description && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{entry.description}</p>
                )}
                {whenValid && (
                  <p className="mt-1.5 text-xs text-slate-400">{format(when, 'dd MMM yyyy, h:mm a')}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
