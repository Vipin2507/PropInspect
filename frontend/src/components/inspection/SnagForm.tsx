import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import type { InspectionResponse, SnagSeverity } from '../../types'

const SEVERITIES: {
  value: SnagSeverity
  label: string
  rest: string
  active: string
}[] = [
  {
    value: 'minor',
    label: 'Minor',
    rest: 'border-ink-200 bg-white text-ink-600',
    active: 'border-warning-600 bg-warning-100 text-warning-600',
  },
  {
    value: 'major',
    label: 'Major',
    rest: 'border-ink-200 bg-white text-ink-600',
    active: 'border-warning-600 bg-warning-600 text-white',
  },
  {
    value: 'critical',
    label: 'Critical',
    rest: 'border-ink-200 bg-white text-ink-600',
    active: 'border-danger-600 bg-danger-600 text-white',
  },
]

export function SnagForm({
  response,
  onChange,
}: {
  itemLabel: string
  response: InspectionResponse
  onChange: (patch: Partial<InspectionResponse>) => void
}) {
  const { reduced } = useMotionSafe()
  const severity = ((response as { severity?: SnagSeverity }).severity as SnagSeverity) || 'minor'

  return (
    <div className="rounded-md border border-danger-600/15 bg-danger-50/30 p-1.5">
      <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-danger-600">
          Severity
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {SEVERITIES.map((s) => {
          const active = severity === s.value
          return (
            <motion.button
              key={s.value}
              type="button"
              whileTap={reduced ? undefined : { scale: 0.96 }}
              onClick={(e) => {
                e.stopPropagation()
                onChange({
                  ...(response as object),
                  severity: s.value,
                } as Partial<InspectionResponse>)
              }}
              className={cn(
                'rounded border py-1.5 text-[11px] font-bold touch-manipulation transition-colors duration-fast',
                active ? s.active : s.rest
              )}
            >
              {s.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
