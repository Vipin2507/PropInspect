import { cn } from '../../utils/cn'
import type { FlatStatus, InspectionStatus, SnagStatus } from '../../types'

const flatStatusStyles: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-primary-light text-primary',
  submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-pass',
  rejected: 'bg-red-100 text-fail',
  revision_required: 'bg-orange-100 text-secondary-dark',
  desnagging: 'bg-purple-100 text-purple-700',
  pass: 'bg-green-100 text-pass',
  fail: 'bg-red-100 text-fail',
  na: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-800',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export function Badge({
  children,
  status,
  className,
}: {
  children?: React.ReactNode
  status?: FlatStatus | InspectionStatus | SnagStatus | string
  className?: string
}) {
  const label = children ?? (status ? formatStatus(status) : '')
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        status ? flatStatusStyles[status] || 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {label}
    </span>
  )
}
