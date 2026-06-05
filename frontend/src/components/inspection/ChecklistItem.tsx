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
  const hasSnag   = response.status === 'fail'

  return (
    <div className="py-4">
      <p className="mb-3 text-base font-medium leading-snug text-slate-800">
        {index}. {label}
      </p>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Pass / Fail / N/A buttons */}
          <div className="flex flex-1 gap-2" style={{ minWidth: 200 }}>
            {(['pass', 'fail', 'na'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={(e) => { e.stopPropagation(); setStatus(s) }}
                className={cn(
                  'flex-1 rounded-xl border py-3 text-sm font-semibold',
                  'touch-manipulation transition-transform active:scale-[0.96]',
                  response.status === s
                    ? {
                        pass: 'border-pass bg-pass text-white',
                        fail: 'border-fail bg-fail text-white',
                        na:   'border-na   bg-na   text-white',
                      }[s]
                    : 'border-slate-200 bg-white text-slate-600 active:bg-slate-50'
                )}
              >
                {s === 'na' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Camera button */}
          <ImageUploader
            images={response.images}
            onAdd={onImageAdd}
            onRemove={onImageRemove}
            readOnly={readOnly}
            trigger={
              <button
                type="button"
                className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                aria-label="Add photo"
              >
                <Camera size={20} aria-hidden="true" />
              </button>
            }
          />
        </div>
      )}

      {/* Remarks */}
      <div className="mt-3">
        <Textarea
          placeholder="Add remarks (optional)…"
          value={response.remarks}
          onChange={(e) => onChange({ remarks: e.target.value })}
          disabled={readOnly}
          rows={2}
        />
      </div>

      {/* Snag details when fail */}
      {hasSnag && !readOnly && (
        <div className="mt-3">
          <SnagForm itemLabel={label} response={response} onChange={onChange} />
        </div>
      )}

      {isMandatoryImage && hasSnag && response.images.length === 0 && !readOnly && (
        <p className="mt-2 text-sm font-medium text-fail">
          ⚠ A photo is required for a Fail status.
        </p>
      )}

      {readOnly && response.images.length > 0 && (
        <div className="mt-3">
          <ImageUploader images={response.images} onAdd={() => {}} onRemove={() => {}} readOnly />
        </div>
      )}
    </div>
  )
}
