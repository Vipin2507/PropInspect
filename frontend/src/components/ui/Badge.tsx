import { cn } from '../../utils/cn'
import type { FlatStatus, InspectionStatus, SnagStatus } from '../../types'

const statusStyles: Record<string, string> = {
  not_started:       'bg-slate-100 text-slate-600',
  in_progress:       'bg-primary-light text-primary',
  submitted:         'bg-amber-100 text-amber-800',
  approved:          'bg-green-100 text-pass',
  rejected:          'bg-red-100 text-fail',
  revision_required: 'bg-orange-100 text-secondary-dark',
  desnagging:        'bg-purple-100 text-purple-700',
  handed_over:       'bg-teal-100 text-teal-700',
  pass:              'bg-green-100 text-pass',
  fail:              'bg-red-100 text-fail',
  na:                'bg-slate-100 text-slate-600',
  pending:           'bg-amber-100 text-amber-800',
  open:              'bg-red-100 text-fail',
  assigned:          'bg-primary-light text-primary',
  in_rectification:  'bg-orange-100 text-secondary-dark',
  rectified:         'bg-teal-100 text-teal-700',
  verified:          'bg-green-100 text-pass',
  closed:            'bg-slate-100 text-slate-600',
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
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize leading-none',
        status ? (statusStyles[status] ?? 'bg-slate-100 text-slate-600') : 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {label}
    </span>
  )
}
