import { cn } from '../../utils/cn'

export function ProgressBar({
  pct,
  progress,
  className,
}: {
  pct?: number
  progress?: number
  className?: string
}) {
  const value = pct ?? progress ?? 0
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-200', className)}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
