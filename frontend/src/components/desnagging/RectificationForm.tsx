import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'

export function RectificationForm({
  remarks,
  onRemarksChange,
  onSubmit,
  loading,
}: {
  remarks: string
  onRemarksChange: (v: string) => void
  onSubmit: () => void
  loading?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <h3 className="mb-3 text-base font-semibold text-slate-800">Mark as Rectified</h3>
      <Textarea
        placeholder="Describe what was done to fix this snag…"
        value={remarks}
        onChange={(e) => onRemarksChange(e.target.value)}
        rows={3}
      />
      <Button className="mt-4 w-full" onClick={onSubmit} loading={loading}>
        Submit Rectification
      </Button>
    </div>
  )
}
