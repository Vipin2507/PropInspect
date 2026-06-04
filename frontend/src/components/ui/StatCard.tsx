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
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md md:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">{value}</p>
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg md:h-10 md:w-10',
              colorClass
            )}
          >
            <Icon size={20} className="shrink-0" />
          </div>
        )}
      </div>
    </div>
  )
}
