import { cn } from '../../utils/cn'
import type { FlatStatus, InspectionStatus, SnagStatus } from '../../types'

const statusStyles: Record<string, string> = {
  not_started: 'bg-ink-100 text-ink-600 border-ink-200',
  in_progress: 'bg-brand-100 text-brand-700 border-brand-200',
  submitted: 'bg-warning-100 text-warning-600 border-warning-600/20',
  approved: 'bg-success-100 text-success-600 border-success-600/20',
  rejected: 'bg-danger-100 text-danger-600 border-danger-600/20',
  revision_required: 'bg-warning-100 text-warning-600 border-warning-600/20',
  desnagging: 'bg-info-100 text-info-600 border-info-600/20',
  handed_over: 'bg-accent-100 text-accent-500 border-accent-500/20',
  pass: 'bg-success-100 text-success-600 border-success-600/20',
  fail: 'bg-danger-100 text-danger-600 border-danger-600/20',
  na: 'bg-ink-100 text-ink-600 border-ink-200',
  pending: 'bg-warning-100 text-warning-600 border-warning-600/20',
  open: 'bg-danger-100 text-danger-600 border-danger-600/20',
  assigned: 'bg-brand-100 text-brand-700 border-brand-200',
  in_rectification: 'bg-warning-100 text-warning-600 border-warning-600/20',
  rectified: 'bg-accent-100 text-accent-500 border-accent-500/20',
  verified: 'bg-success-100 text-success-600 border-success-600/20',
  closed: 'bg-ink-100 text-ink-600 border-ink-200',
  active: 'bg-brand-100 text-brand-700 border-brand-200',
  completed: 'bg-success-100 text-success-600 border-success-600/20',
  on_hold: 'bg-warning-100 text-warning-600 border-warning-600/20',
}

const dotStyles: Record<string, string> = {
  not_started: 'bg-ink-400',
  in_progress: 'bg-brand-500',
  submitted: 'bg-warning-600',
  approved: 'bg-success-600',
  rejected: 'bg-danger-600',
  revision_required: 'bg-warning-600',
  desnagging: 'bg-info-600',
  handed_over: 'bg-accent-500',
  pass: 'bg-success-600',
  fail: 'bg-danger-600',
  na: 'bg-ink-400',
  pending: 'bg-warning-600',
  open: 'bg-danger-600',
  assigned: 'bg-brand-500',
  in_rectification: 'bg-warning-600',
  rectified: 'bg-accent-500',
  verified: 'bg-success-600',
  closed: 'bg-ink-400',
  active: 'bg-brand-500',
  completed: 'bg-success-600',
  on_hold: 'bg-warning-600',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

/** @deprecated Prefer StatusBadge — kept for existing imports */
export function Badge({
  children,
  status,
  className,
}: {
  children?: React.ReactNode
  status?: FlatStatus | InspectionStatus | SnagStatus | string
  className?: string
}) {
  return (
    <StatusBadge status={status} className={className}>
      {children}
    </StatusBadge>
  )
}

export function StatusBadge({
  children,
  status,
  className,
}: {
  children?: React.ReactNode
  status?: FlatStatus | InspectionStatus | SnagStatus | string
  className?: string
}) {
  const key = status || ''
  const label = children ?? (status ? formatStatus(status) : '')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label uppercase tracking-wide leading-none',
        status ? (statusStyles[key] ?? 'bg-ink-100 text-ink-600 border-ink-200') : 'bg-ink-100 text-ink-600 border-ink-200',
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          status ? (dotStyles[key] ?? 'bg-ink-400') : 'bg-ink-400'
        )}
        aria-hidden
      />
      <span className="normal-case tracking-normal font-semibold text-[11px]">{label}</span>
    </span>
  )
}
