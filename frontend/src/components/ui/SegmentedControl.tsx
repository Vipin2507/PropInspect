import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import type { ReactNode } from 'react'

export type SegmentOption<T extends string> = {
  value: T
  label: string
  tone?: 'pass' | 'fail' | 'na' | 'default'
  icon?: ReactNode
}

const toneRest: Record<string, string> = {
  pass: 'text-success-600',
  fail: 'text-danger-600',
  na: 'text-ink-500',
  default: 'text-ink-600',
}

const toneActive: Record<string, string> = {
  pass: 'bg-success-600 text-white shadow-sm',
  fail: 'bg-danger-600 text-white shadow-sm',
  na: 'bg-ink-600 text-white shadow-sm',
  default: 'bg-brand-600 text-white shadow-sm',
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId = 'segment',
  className,
}: {
  options: SegmentOption<T>[]
  value: T | null | undefined
  onChange: (v: T) => void
  layoutId?: string
  className?: string
}) {
  const { reduced } = useMotionSafe()

  return (
    <div
      className={cn(
        'flex w-full gap-1 rounded-lg bg-ink-100/90 p-1 shadow-inner',
        className
      )}
      role="group"
    >
      {options.map((opt) => {
        const tone = opt.tone ?? 'default'
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-0 flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-md px-1.5',
              'text-xs font-semibold touch-manipulation transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100',
              !active && toneRest[tone],
              !active && 'hover:bg-white/60',
              active && !reduced && 'text-white'
            )}
          >
            {active && !reduced && (
              <motion.span
                layoutId={layoutId}
                className={cn('absolute inset-0 -z-10 rounded-md', toneActive[tone])}
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
              />
            )}
            {active && reduced && (
              <span className={cn('absolute inset-0 -z-10 rounded-md', toneActive[tone])} />
            )}
            {opt.icon && (
              <span className={cn('relative z-10', active ? 'text-white' : 'opacity-80')}>
                {opt.icon}
              </span>
            )}
            <span className={cn('relative z-10', active && 'text-white')}>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
