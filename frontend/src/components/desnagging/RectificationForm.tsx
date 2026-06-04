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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">Mark as Rectified</h3>
      <Textarea
        className="mt-3"
        placeholder="Rectification remarks..."
        value={remarks}
        onChange={(e) => onRemarksChange(e.target.value)}
        rows={3}
      />
      <Button className="mt-3 w-full" onClick={onSubmit} loading={loading}>
        Mark as Rectified
      </Button>
    </div>
  )
}
