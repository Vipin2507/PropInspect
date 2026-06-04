import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { ROUTES } from '../../constants/routes'
import type { Snag } from '../../types'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '../../utils/cn'
import { AlertTriangle } from 'lucide-react'

export function SnagCard({ snag, flatNumber }: { snag: Snag; flatNumber?: string }) {
  const severityColor = {
    critical: 'bg-red-100 text-red-800',
    major: 'bg-orange-100 text-orange-800',
    minor: 'bg-yellow-100 text-yellow-800',
  }[snag.severity]

  return (
    <Link
      to={ROUTES.DESNAGGING_DETAIL(snag.id)}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-slate-900">
            {flatNumber || snag.flatId} &middot; {snag.itemLabel}
          </p>
          <p className="text-sm text-slate-500">{snag.category}</p>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase',
            severityColor
          )}
        >
          <AlertTriangle size={12} />
          <span>{snag.severity}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Badge status={snag.status}>{snag.status.replace(/_/g, ' ')}</Badge>
        <span className="text-xs text-slate-400">
          {formatDistanceToNow(new Date(snag.createdAt), { addSuffix: true })}
        </span>
      </div>
    </Link>
  )
}
