import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import type { InspectionResponse, ResponseStatus } from '../../types'
import { ImageUploader } from './ImageUploader'
import { SnagForm } from './SnagForm'
import { Textarea } from '../ui/Textarea'
import { SegmentedControl } from '../ui/SegmentedControl'
import { Card } from '../ui/Card'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import {
  RotateCcw, Lock, AlertTriangle, Check, X, Minus,
} from 'lucide-react'

const easeOut = [0.22, 1, 0.36, 1] as const

const ACCENT: Record<string, string> = {
  pass: 'bg-success-600',
  fail: 'bg-danger-600',
  na: 'bg-ink-400',
  pending: 'bg-brand-400',
}

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
  const { reduced } = useMotionSafe()
  const setStatus = (status: ResponseStatus) => onChange({ status })
  const hasSnag = response.status === 'fail'
  const hasStatus = response.status !== 'pending'

  const needsRevision = response.qaDecision === 'revision_required'
  const isApproved = response.qaDecision === 'approved'
  const isRejected = response.qaDecision === 'rejected'
  const isDisabled = readOnly || locked

  const accent =
    ACCENT[
      needsRevision
        ? 'pending'
        : isRejected
          ? 'fail'
          : response.status || 'pending'
    ]

  return (
    <Card
      className={cn(
        'relative overflow-hidden shadow-xs',
        response.status === 'pass' && 'border-success-600/20',
        response.status === 'fail' && 'border-danger-600/20',
        response.status === 'na' && 'border-ink-200',
        !hasStatus && !needsRevision && 'border-ink-100/80',
        needsRevision && 'border-warning-600/30 bg-warning-50/20',
        isApproved && 'border-success-600/20',
        isRejected && 'border-danger-600/20'
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-0.5', accent)} />

      <div className="flex items-center gap-2 pl-2.5 pr-1.5 pt-2 pb-1.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold tabular text-ink-500 bg-ink-100">
          {index}
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight text-ink-950">
          {label}
        </p>
        {!isDisabled && hasStatus && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange({ status: 'pending', remarks: '' })
            }}
            className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-md text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            title="Reset"
            aria-label="Reset task status"
          >
            <RotateCcw size={13} aria-hidden />
          </button>
        )}
      </div>

      {locked && (
        <div className="mx-2 mb-1.5 flex items-center gap-1.5 rounded bg-ink-50 px-2 py-1 text-[10px] font-medium text-ink-600">
          <Lock size={10} aria-hidden />
          Locked — contact QA
        </div>
      )}

      {needsRevision && (
        <div className="mx-2 mb-1.5 rounded border border-warning-600/20 bg-warning-100 px-2 py-1.5 text-[11px] text-warning-600">
          <span className="font-semibold">Revision: </span>
          {response.qaRemarks || 'Please correct this task.'}
        </div>
      )}
      {isRejected && response.qaRemarks && (
        <div className="mx-2 mb-1.5 rounded border border-danger-600/20 bg-danger-100 px-2 py-1.5 text-[11px] text-danger-600">
          <span className="font-semibold">Rejected: </span>
          {response.qaRemarks}
        </div>
      )}

      {!isDisabled && (
        <div className="space-y-1.5 px-2 pb-2 pl-2.5">
          <SegmentedControl
            layoutId={`status-${response.id}`}
            value={hasStatus ? (response.status as 'pass' | 'fail' | 'na') : null}
            onChange={(s) => setStatus(s)}
            className="!gap-0.5 !rounded-md !p-0.5"
            options={[
              {
                value: 'pass',
                label: 'Pass',
                tone: 'pass',
                icon: <Check size={12} strokeWidth={2.5} aria-hidden />,
              },
              {
                value: 'fail',
                label: 'Fail',
                tone: 'fail',
                icon: <X size={12} strokeWidth={2.5} aria-hidden />,
              },
              {
                value: 'na',
                label: 'N/A',
                tone: 'na',
                icon: <Minus size={12} strokeWidth={2.5} aria-hidden />,
              },
            ]}
          />

          <Textarea
            placeholder={
              response.status === 'fail' ? 'Remarks (required)…' : 'Remarks (optional)…'
            }
            value={response.remarks}
            onChange={(e) => onChange({ remarks: e.target.value })}
            rows={1}
            className={cn(
              'min-h-[34px] !rounded-md !border-ink-200/80 !bg-ink-50/30 !px-2.5 !py-1.5 text-[13px] leading-snug !shadow-none',
              'focus:!border-brand-500 focus:!bg-white focus:!ring-2 focus:!ring-brand-100',
              response.status === 'fail' &&
                !response.remarks.trim() &&
                '!border-danger-600/40 focus:!border-danger-600 focus:!ring-danger-100'
            )}
          />

          <ImageUploader
            images={response.images}
            onAdd={onImageAdd}
            onRemove={onImageRemove}
            compact
          />

          <AnimatePresence initial={false}>
            {hasSnag && (
              <motion.div
                key="snag"
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reduced ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: easeOut }}
                className="overflow-hidden"
              >
                <SnagForm itemLabel={label} response={response} onChange={onChange} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {isMandatoryImage && hasSnag && response.images.length === 0 && (
              <motion.p
                key="photo-req"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                className="flex items-center gap-1 text-[11px] font-medium text-danger-600"
              >
                <AlertTriangle size={11} aria-hidden />
                Photo required
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {isDisabled && (
        <div className="space-y-1.5 px-2 pb-2 pl-2.5">
          {response.remarks ? (
            <p className="rounded-md bg-ink-50 px-2 py-1.5 text-[12px] italic text-ink-600">
              &ldquo;{response.remarks}&rdquo;
            </p>
          ) : null}
          {response.images.length > 0 && (
            <ImageUploader
              images={response.images}
              onAdd={() => {}}
              onRemove={() => {}}
              readOnly
              compact
            />
          )}
        </div>
      )}
    </Card>
  )
}
