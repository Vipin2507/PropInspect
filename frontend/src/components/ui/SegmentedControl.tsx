import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useMotionSafe } from '../../hooks/useMotionSafe'

export type SegmentOption<T extends string> = {
  value: T
  label: string
  tone?: 'pass' | 'fail' | 'na' | 'default'
}

const toneRest: Record<string, string> = {
  pass: 'text-success-600 bg-success-100/40',
  fail: 'text-danger-600 bg-danger-100/40',
  na: 'text-ink-600 bg-ink-100/60',
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
        'flex w-full gap-1 rounded-md bg-ink-100 p-1',
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
              'relative z-0 flex min-h-[44px] flex-1 items-center justify-center rounded-md px-2',
              'text-sm font-semibold touch-manipulation transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
              !active && toneRest[tone],
              active && !reduced && 'text-white'
            )}
          >
            {active && !reduced && (
              <motion.span
                layoutId={layoutId}
                className={cn('absolute inset-0 -z-10 rounded-md', toneActive[tone])}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            {active && reduced && (
              <span className={cn('absolute inset-0 -z-10 rounded-md', toneActive[tone])} />
            )}
            <span className={cn('relative z-10', active && 'text-white')}>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
