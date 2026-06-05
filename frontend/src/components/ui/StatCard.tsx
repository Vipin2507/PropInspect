import { cn } from '../../utils/cn'
import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  colorClass = 'text-primary bg-primary-light',
}: {
  label: string
  value: string | number
  icon?: LucideIcon
  colorClass?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-tight">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold leading-none text-slate-900">{value}</p>
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colorClass)}>
            <Icon size={20} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  )
}
