import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '../../utils/cn'

export type DonutSlice = { name: string; value: number; fill: string }

function Tip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: DonutSlice }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-md border border-ink-100 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <span className="font-semibold text-ink-800">{p.name}</span>
      <span className="ml-2 tabular text-ink-600">{p.value}</span>
    </div>
  )
}

/** Compact professional donut used on dashboards */
export function StatusDonut({
  data,
  centerLabel,
  centerValue,
  height = 140,
  className,
}: {
  data: DonutSlice[]
  centerLabel?: string
  centerValue?: string | number
  height?: number
  className?: string
}) {
  const total = data.reduce((a, d) => a + d.value, 0)

  if (total === 0) {
    return (
      <div className={cn('flex items-center justify-center text-caption text-ink-400', className)} style={{ height }}>
        No data
      </div>
    )
  }

  return (
    <div className={cn('relative', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip content={<Tip />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel != null || centerValue != null) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue != null && (
            <span className="font-display text-lg font-bold tabular text-ink-950 leading-none">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-400">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export const CHART_COLORS = {
  approved: '#0F9D58',
  submitted: '#D97706',
  in_progress: '#009BFF',
  revision: '#F59E0B',
  rejected: '#DC2626',
  desnagging: '#7C3AED',
  not_started: '#94A3B8',
  handed_over: '#0D9488',
} as const
