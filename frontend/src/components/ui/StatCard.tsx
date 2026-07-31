import { cn } from '../../utils/cn'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

export function StatCard({
  label,
  value,
  icon: Icon,
  colorClass = 'text-brand-600 bg-brand-100',
  className,
  index = 0,
  onClick,
}: {
  label: string
  value: string | number
  icon?: LucideIcon
  colorClass?: string
  className?: string
  index?: number
  onClick?: () => void
}) {
  const { reduced, stagger } = useMotionSafe()
  const interactive = !!onClick

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={stagger(index)}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'rounded-md border border-ink-100/80 bg-surface p-2.5 shadow-xs',
        'transition-all duration-fast ease-out',
        interactive &&
          'cursor-pointer touch-manipulation hover:shadow-sm hover:border-brand-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              colorClass
            )}
          >
            <Icon size={15} aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-400 leading-tight">
            {label}
          </p>
          <p className="mt-0.5 font-display text-xl font-bold tabular leading-none text-ink-950">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
