import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { ROUTES } from '../../constants/routes'
import type { Snag } from '../../types'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '../../utils/cn'
import { AlertTriangle } from 'lucide-react'

export function SnagCard({ snag, flatNumber }: { snag: Snag; flatNumber?: string }) {
  const severityColor = {
    critical: 'bg-red-100 text-red-700',
    major:    'bg-orange-100 text-orange-700',
    minor:    'bg-yellow-100 text-yellow-700',
  }[snag.severity] ?? 'bg-slate-100 text-slate-600'

  return (
    <Link
      to={ROUTES.DESNAGGING_DETAIL(snag.id)}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98] active:shadow-md transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 leading-snug">
            {flatNumber || snag.flatId} &middot; {snag.itemLabel}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">{snag.category}</p>
        </div>
        <div className={cn(
          'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase',
          severityColor
        )}>
          <AlertTriangle size={11} aria-hidden="true" />
          {snag.severity}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Badge status={snag.status} />
        <span className="text-xs text-slate-400">
          {formatDistanceToNow(new Date(snag.createdAt), { addSuffix: true })}
        </span>
      </div>
    </Link>
  )
}
