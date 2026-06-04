import { cn } from '../../utils/cn'

export function ProgressRing({
  pct,
  progress,
  size = 120,
  strokeWidth = 10,
  color = '#1A6FE8',
}: {
  pct?: number
  progress?: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const value = pct ?? progress ?? 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <div className={cn('font-bold text-slate-900', size <= 90 ? 'text-lg' : 'text-2xl')}>
          {Math.round(value)}%
        </div>
        <div className="text-xs text-slate-500">Complete</div>
      </div>
    </div>
  )
}
