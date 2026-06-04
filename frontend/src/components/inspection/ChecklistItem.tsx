import { cn } from '../../utils/cn'
import type { InspectionResponse, ResponseStatus } from '../../types'
import { ImageUploader } from './ImageUploader'
import { SnagForm } from './SnagForm'
import { Textarea } from '../ui/Textarea'
import { Camera } from 'lucide-react'

export function ChecklistItem({
  index,
  label,
  isMandatoryImage,
  response,
  onChange,
  onImageAdd,
  onImageRemove,
  readOnly,
}: {
  index: number
  label: string
  isMandatoryImage: boolean
  response: InspectionResponse
  onChange: (patch: Partial<InspectionResponse>) => void
  onImageAdd: (file: File, preview: string) => void
  onImageRemove: (id: string) => void
  readOnly?: boolean
}) {
  const setStatus = (status: ResponseStatus) => onChange({ status })

  const hasSnag = response.status === 'fail'

  return (
    <div className="py-4" onClick={() => { /* Full row tap area */ }}>
      <p className="mb-3 font-medium text-slate-800">
        {index}. {label}
      </p>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 min-w-[200px] gap-2">
            {(['pass', 'fail', 'na'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  'flex-1 rounded-lg border py-3 text-sm font-semibold transition-all touch-manipulation active:scale-[0.97]',
                  response.status === s
                    ? {
                        pass: 'border-pass bg-pass text-white',
                        fail: 'border-fail bg-fail text-white',
                        na: 'border-na bg-na text-white',
                      }[s]
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {s === 'na' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <ImageUploader
            images={response.images}
            onAdd={onImageAdd}
            onRemove={onImageRemove}
            readOnly={readOnly}
            trigger={
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600"
              >
                <Camera size={20} />
              </button>
            }
          />
        </div>
      )}

      <div className="mt-3">
        <Textarea
          placeholder="Add remarks (optional)..."
          value={response.remarks}
          onChange={(e) => onChange({ remarks: e.target.value })}
          disabled={readOnly}
          rows={2}
        />
      </div>

      {hasSnag && !readOnly && (
        <div className="mt-3">
          <SnagForm itemLabel={label} response={response} onChange={onChange} />
        </div>
      )}

      {isMandatoryImage && hasSnag && response.images.length === 0 && !readOnly && (
        <p className="mt-2 text-xs text-fail">
          An image is mandatory for a 'Fail' status.
        </p>
      )}

      {readOnly && response.images.length > 0 && (
        <div className="mt-2">
          <ImageUploader
            images={response.images}
            onAdd={() => {}}
            onRemove={() => {}}
            readOnly
          />
        </div>
      )}
    </div>
  )
}
