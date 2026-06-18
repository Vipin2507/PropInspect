import { cn } from '../../utils/cn'
import type { InspectionResponse, ResponseStatus } from '../../types'
import { ImageUploader } from './ImageUploader'
import { SnagForm } from './SnagForm'
import { Textarea } from '../ui/Textarea'
import { RotateCcw, Lock } from 'lucide-react'

const STATUS_CONFIG = {
  pass: { label: 'Pass', active: 'bg-pass border-pass text-white', dot: 'bg-pass' },
  fail: { label: 'Fail', active: 'bg-fail border-fail text-white', dot: 'bg-fail' },
  na:   { label: 'N/A',  active: 'bg-na   border-na   text-white', dot: 'bg-slate-400' },
} as const

export function ChecklistItem({
  index,
  label,
  isMandatoryImage,
  response,
  onChange,
  onImageAdd,
  onImageRemove,
  readOnly,
  locked,
}: {
  index: number
  label: string
  isMandatoryImage: boolean
  response: InspectionResponse
  onChange: (patch: Partial<InspectionResponse>) => void
  onImageAdd: (file: File, base64: string) => void
  onImageRemove: (id: string) => void
  readOnly?: boolean
  /** When true, all editing controls are disabled (inspection is locked). Req 1.4 / 2.4 */
  locked?: boolean
}) {
  const setStatus = (status: ResponseStatus) => onChange({ status })
  const hasSnag   = response.status === 'fail'
  const hasStatus = response.status !== 'pending'

  // Req 6.3 — highlight tasks the Checker flagged for revision
  const needsRevision = response.qaDecision === 'revision_required'
  const isApproved    = response.qaDecision === 'approved'
  const isRejected    = response.qaDecision === 'rejected'

  const isDisabled = readOnly || locked

  return (
    <div className={cn(
      'rounded-2xl border bg-white transition-all',
      needsRevision
        ? 'border-amber-400 shadow-sm'
        : isApproved
        ? 'border-green-300 shadow-sm'
        : isRejected
        ? 'border-red-300 shadow-sm'
        : hasStatus
        ? response.status === 'fail'
          ? 'border-red-200 shadow-sm'
          : response.status === 'pass'
          ? 'border-green-200 shadow-sm'
          : 'border-slate-200 shadow-sm'
        : 'border-slate-200'
    )}>
      {/* ── Item header ── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Status dot indicator */}
        <div className={cn(
          'mt-1 h-2.5 w-2.5 shrink-0 rounded-full transition-colors',
          hasStatus ? STATUS_CONFIG[response.status as keyof typeof STATUS_CONFIG]?.dot ?? 'bg-slate-200' : 'bg-slate-200'
        )} />
        <p className="flex-1 text-sm font-semibold leading-snug text-slate-800 md:text-base">
          {index}. {label}
        </p>
        {/* Req 2 — Reset button (only when not locked/readOnly and status is set) */}
        {!isDisabled && hasStatus && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange({ status: 'pending', remarks: '' })
            }}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 text-slate-400 active:bg-slate-100 touch-manipulation"
            title="Reset to pending"
            aria-label="Reset task status"
          >
            <RotateCcw size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Locked state ── */}
      {locked && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
          <Lock size={12} aria-hidden="true" />
          Inspection is locked — contact QA for revision
        </div>
      )}

      {/* ── QA revision feedback ── */}
      {needsRevision && response.qaRemarks && (
        <div className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <p className="font-semibold text-amber-700">Revision Required</p>
          <p className="mt-0.5 text-amber-700">{response.qaRemarks}</p>
        </div>
      )}
      {isRejected && response.qaRemarks && (
        <div className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm">
          <p className="font-semibold text-red-700">Rejected by QA</p>
          <p className="mt-0.5 text-red-700">{response.qaRemarks}</p>
        </div>
      )}

      {!isDisabled && (
        <div className="space-y-3 px-4 pb-4">
          {/* ── Pass / Fail / N/A buttons — full width row ── */}
          <div className="grid grid-cols-3 gap-2">
            {(['pass', 'fail', 'na'] as const).map((s) => {
              const cfg = STATUS_CONFIG[s]
              const isActive = response.status === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setStatus(s) }}
                  className={cn(
                    'rounded-xl border-2 py-3 text-sm font-bold transition-all touch-manipulation',
                    'active:scale-[0.96]',
                    isActive
                      ? cfg.active
                      : 'border-slate-200 bg-slate-50 text-slate-500 active:bg-slate-100'
                  )}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {/* ── Remarks textarea ── */}
          <Textarea
            placeholder={response.status === 'fail' ? 'Remarks (required for Fail)…' : 'Remarks (optional)…'}
            value={response.remarks}
            onChange={(e) => onChange({ remarks: e.target.value })}
            rows={2}
            className={cn('text-sm', response.status === 'fail' && !response.remarks.trim() && 'border-red-300')}
          />

          {/* ── Image section ── */}
          <div className="rounded-xl bg-slate-50 p-3">
            <ImageUploader
              images={response.images}
              onAdd={onImageAdd}
              onRemove={onImageRemove}
            />
          </div>

          {/* ── Snag severity (only on Fail) ── */}
          {hasSnag && (
            <SnagForm itemLabel={label} response={response} onChange={onChange} />
          )}

          {/* ── Mandatory image warning ── */}
          {isMandatoryImage && hasSnag && response.images.length === 0 && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-fail">
              ⚠ Photo required for Fail
            </p>
          )}
        </div>
      )}

      {/* ── Read-only / locked view ── */}
      {isDisabled && (
        <div className="px-4 pb-4 space-y-3">
          {response.remarks ? (
            <p className="text-sm text-slate-600 italic">"{response.remarks}"</p>
          ) : null}
          {response.images.length > 0 && (
            <ImageUploader
              images={response.images}
              onAdd={() => {}}
              onRemove={() => {}}
              readOnly
            />
          )}
        </div>
      )}
    </div>
  )
}
