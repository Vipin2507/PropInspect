import { useEffect, useState } from 'react'
import { FLAT_STATUS_OPTIONS } from '../../constants/flatStatus'
import { flatsApi } from '../../utils/api'
import type { Flat, FlatStatus } from '../../types'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'
import { Settings2 } from 'lucide-react'

export function AdminFlatStatusControl({
  flat,
  onUpdated,
}: {
  flat: Flat
  onUpdated: (updated: Flat) => void
}) {
  const [status, setStatus] = useState<FlatStatus>(flat.status)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus(flat.status)
  }, [flat.status, flat.id])

  const hasChange = status !== flat.status

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await flatsApi.setStatus(flat.id, status)
      onUpdated(data)
      toast.success('Flat status updated')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update status'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Settings2 size={16} className="text-slate-500" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-800">Admin: Update Flat Status</p>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Override the workflow stage at any point — inspection status will be synced automatically.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as FlatStatus)}
          className="flex-1"
          aria-label="Flat status"
        >
          {FLAT_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!hasChange}
          className="sm:w-auto"
        >
          Save Status
        </Button>
      </div>
    </div>
  )
}
