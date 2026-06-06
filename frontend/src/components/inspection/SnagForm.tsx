import { cn } from '../../utils/cn'
import type { InspectionResponse, SnagSeverity } from '../../types'

const SEVERITIES: { value: SnagSeverity; label: string; color: string; activeColor: string }[] = [
  { value: 'minor',    label: 'Minor',    color: 'border-slate-200 bg-slate-50 text-slate-600',       activeColor: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'major',    label: 'Major',    color: 'border-slate-200 bg-slate-50 text-slate-600',       activeColor: 'border-orange-400 bg-orange-50 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'border-slate-200 bg-slate-50 text-slate-600',       activeColor: 'border-red-500 bg-red-50 text-red-700' },
]

export function SnagForm({
  response,
  onChange,
}: {
  itemLabel: string
  response: InspectionResponse
  onChange: (patch: Partial<InspectionResponse>) => void
}) {
  const severity = (response as any).severity as SnagSeverity || 'minor'

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/40 p-3">
      <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-fail">
        Snag Severity
      </p>
      <div className="grid grid-cols-3 gap-2">
        {SEVERITIES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange({ ...(response as object), severity: s.value } as Partial<InspectionResponse>)
            }}
            className={cn(
              'rounded-xl border-2 py-2.5 text-sm font-bold transition-all touch-manipulation active:scale-[0.96]',
              severity === s.value ? s.activeColor : s.color
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
