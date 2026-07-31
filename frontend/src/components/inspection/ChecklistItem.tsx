import { cn } from '../../utils/cn'
import type { InspectionResponse, ResponseStatus } from '../../types'
import { ImageUploader } from './ImageUploader'
import { SnagForm } from './SnagForm'
import { Textarea } from '../ui/Textarea'
import { SegmentedControl } from '../ui/SegmentedControl'
import { Card } from '../ui/Card'
import { RotateCcw, Lock, AlertTriangle } from 'lucide-react'

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
  locked?: boolean
}) {
  const setStatus = (status: ResponseStatus) => onChange({ status })
  const hasSnag = response.status === 'fail'
  const hasStatus = response.status !== 'pending'

  const needsRevision = response.qaDecision === 'revision_required'
  const isApproved = response.qaDecision === 'approved'
  const isRejected = response.qaDecision === 'rejected'
  const isDisabled = readOnly || locked

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-base',
        needsRevision && 'border-warning-600/30 bg-warning-100/20',
        isApproved && 'border-success-600/20',
        isRejected && 'border-danger-600/20',
        !needsRevision &&
          !isApproved &&
          !isRejected &&
          hasStatus &&
          response.status === 'pass' &&
          'border-success-600/15',
        !needsRevision &&
          !isApproved &&
          !isRejected &&
          hasStatus &&
          response.status === 'fail' &&
          'border-danger-600/15',
        !hasStatus && !needsRevision && 'border-brand-200/60 bg-brand-50/20'
      )}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className={cn(
            'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
            response.status === 'pass' && 'bg-success-600',
            response.status === 'fail' && 'bg-danger-600',
            response.status === 'na' && 'bg-ink-400',
            response.status === 'pending' && 'bg-ink-200'
          )}
        />
        <p className="flex-1 text-sm font-semibold leading-snug text-ink-800 md:text-base">
          {index}. {label}
        </p>
        {!isDisabled && hasStatus && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange({ status: 'pending', remarks: '' })
            }}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 active:scale-95 touch-manipulation"
            title="Reset to pending"
            aria-label="Reset task status"
          >
            <RotateCcw size={14} aria-hidden />
          </button>
        )}
      </div>

      {locked && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs font-medium text-ink-600">
          <Lock size={12} aria-hidden />
          Inspection is locked — contact QA for revision
        </div>
      )}

      {needsRevision && (
        <div className="mx-4 mb-3 rounded-lg border border-warning-600/20 bg-warning-100 px-3 py-2 text-sm text-warning-600">
          <p className="font-semibold">Sent for revision by QA</p>
          <p className="mt-0.5">{response.qaRemarks || 'Please review and correct this task.'}</p>
        </div>
      )}
      {isRejected && response.qaRemarks && (
        <div className="mx-4 mb-3 rounded-lg border border-danger-600/20 bg-danger-100 px-3 py-2 text-sm text-danger-600">
          <p className="font-semibold">Rejected by QA</p>
          <p className="mt-0.5">{response.qaRemarks}</p>
        </div>
      )}

      {!isDisabled && (
        <div className="space-y-3 px-4 pb-4">
          <SegmentedControl
            layoutId={`status-${response.id}`}
            value={hasStatus ? (response.status as 'pass' | 'fail' | 'na') : null}
            onChange={(s) => setStatus(s)}
            options={[
              { value: 'pass', label: 'Pass', tone: 'pass' },
              { value: 'fail', label: 'Fail', tone: 'fail' },
              { value: 'na', label: 'N/A', tone: 'na' },
            ]}
          />

          <Textarea
            placeholder={
              response.status === 'fail' ? 'Remarks (required for Fail)…' : 'Remarks (optional)…'
            }
            value={response.remarks}
            onChange={(e) => onChange({ remarks: e.target.value })}
            rows={2}
            className={cn(
              'rounded-md border-ink-200 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-100',
              response.status === 'fail' && !response.remarks.trim() && 'border-danger-600/40'
            )}
          />

          <div className="rounded-lg bg-ink-50 p-3">
            <ImageUploader images={response.images} onAdd={onImageAdd} onRemove={onImageRemove} />
          </div>

          {hasSnag && <SnagForm itemLabel={label} response={response} onChange={onChange} />}

          {isMandatoryImage && hasSnag && response.images.length === 0 && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-danger-600">
              <AlertTriangle size={14} aria-hidden />
              Photo required for Fail
            </p>
          )}
        </div>
      )}

      {isDisabled && (
        <div className="space-y-3 px-4 pb-4">
          {response.remarks ? (
            <p className="rounded-md bg-ink-50 p-3 text-sm italic text-ink-600">
              &ldquo;{response.remarks}&rdquo;
            </p>
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
    </Card>
  )
}
