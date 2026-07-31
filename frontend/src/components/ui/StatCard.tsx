import { cn } from '../../utils/cn'
import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  colorClass = 'text-brand-600 bg-brand-100',
  className,
}: {
  label: string
  value: string | number
  icon?: LucideIcon
  colorClass?: string
  className?: string
}) {
  const accent = colorClass.includes('success') || colorClass.includes('green') || colorClass.includes('pass')
    ? 'border-t-success-600'
    : colorClass.includes('warning') || colorClass.includes('amber') || colorClass.includes('orange') || colorClass.includes('pending')
      ? 'border-t-warning-600'
      : colorClass.includes('danger') || colorClass.includes('red') || colorClass.includes('fail')
        ? 'border-t-danger-600'
        : colorClass.includes('teal') || colorClass.includes('accent')
          ? 'border-t-accent-500'
          : 'border-t-brand-500'

  return (
    <div
      className={cn(
        'rounded-lg border border-ink-100/80 border-t-[3px] bg-surface p-4 shadow-sm',
        'transition-all duration-base ease-out hover:shadow-md hover:-translate-y-0.5',
        accent,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label uppercase tracking-wider text-ink-400">{label}</p>
          <p className="mt-1.5 font-display text-display tabular leading-none text-ink-950">{value}</p>
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              colorClass
            )}
          >
            <Icon size={20} aria-hidden />
          </div>
        )}
      </div>
    </div>
  )
}
