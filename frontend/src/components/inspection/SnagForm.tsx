import { Select } from '../ui/Select'
import type { InspectionResponse, SnagSeverity } from '../../types'

export function SnagForm({
  itemLabel,
  response,
  onChange,
}: {
  itemLabel: string
  response: InspectionResponse
  onChange: (patch: Partial<InspectionResponse>) => void
}) {
  return (
    <div className="mb-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
      <p className="text-sm font-semibold text-fail">{itemLabel} — Fail</p>
      <label className="mt-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        Severity
      </label>
      <Select
        className="mt-1"
        value={(response as InspectionResponse & { severity?: SnagSeverity }).severity || 'minor'}
        onChange={(e) =>
          onChange({ ...(response as object), severity: e.target.value } as Partial<InspectionResponse>)
        }
      >
        <option value="critical">Critical</option>
        <option value="major">Major</option>
        <option value="minor">Minor</option>
      </Select>
    </div>
  )
}
