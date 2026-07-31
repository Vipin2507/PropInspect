import { cn } from '../../utils/cn'

export function ProgressBar({
  pct,
  progress,
  value,
  min = 0,
  max = 100,
  showLabel,
  className,
}: {
  pct?: number
  progress?: number
  value?: number
  min?: number
  max?: number
  showLabel?: boolean
  className?: string
}) {
  const raw = value ?? pct ?? progress ?? 0
  const range = Math.max(1, max - min)
  const normalized = Math.min(100, Math.max(0, ((raw - min) / range) * 100))
  const high = normalized >= 80

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-caption text-ink-600">
          <span>Progress</span>
          <span className="tabular font-semibold text-ink-800">{Math.round(normalized)}%</span>
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn(
            'relative h-full overflow-hidden rounded-full transition-[width] duration-slow ease-out',
            high
              ? 'bg-gradient-to-r from-success-600 to-success-600'
              : 'bg-gradient-to-r from-brand-500 to-brand-600'
          )}
          style={{ width: `${normalized}%` }}
        >
          <span className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
      </div>
    </div>
  )
}
