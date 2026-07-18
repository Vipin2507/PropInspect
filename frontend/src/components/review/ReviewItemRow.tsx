import { useEffect, useState } from 'react'
import { Badge } from '../ui/Badge'
import type { InspectionResponse, SnagImage } from '../../types'
import { Textarea } from '../ui/Textarea'
import { Camera, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { resolveMediaUrl, imagesApi } from '../../utils/api'
import { queueChange } from '../../utils/sync'
import { Lightbox } from '../ui/Lightbox'
import { useResponses } from '../../hooks/useResponses'
import { ImageUploader } from '../inspection/ImageUploader'
import toast from 'react-hot-toast'
import { generateId } from '../../utils/id'
import { cn } from '../../utils/cn'

type QADecision = 'approved' | 'rejected' | 'revision_required'

const DECISION_CONFIG: Record<QADecision, { label: string; icon: React.ReactNode; active: string; badge: React.ReactNode }> = {
  approved: {
    label: 'Approve',
    icon: <CheckCircle2 size={15} aria-hidden="true" />,
    active: 'bg-green-600 border-green-600 text-white',
    badge: <CheckCircle2 size={14} className="text-green-600" aria-hidden="true" />,
  },
  rejected: {
    label: 'Reject',
    icon: <XCircle size={15} aria-hidden="true" />,
    active: 'bg-red-600 border-red-600 text-white',
    badge: <XCircle size={14} className="text-red-600" aria-hidden="true" />,
  },
  revision_required: {
    label: 'Revision',
    icon: <Clock size={15} aria-hidden="true" />,
    active: 'bg-amber-500 border-amber-500 text-white',
    badge: <Clock size={14} className="text-amber-500" aria-hidden="true" />,
  },
}

export function ReviewItemRow({
  index,
  label,
  response: initialResponse,
  inspectionId,
  onResponseUpdate,
  qaComment,
  onQaComment,
  readOnly = false,
}: {
  index: number
  label: string
  response: InspectionResponse
  inspectionId: string
  onResponseUpdate?: (updated: Partial<InspectionResponse>) => void
  qaComment: string
  onQaComment: (v: string) => void
  readOnly?: boolean
  /** @deprecated kept for API compat — evidence upload always enabled when editable */
  taskReviewOnly?: boolean
}) {
  const [response, setResponse] = useState(initialResponse)
  const [remarkText, setRemarkText] = useState(
    () => initialResponse.qaRemarks || qaComment || ''
  )
  const [pendingDecision, setPendingDecision] = useState<QADecision | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [evidenceImages, setEvidenceImages] = useState<SnagImage[]>(
    initialResponse.images.filter((i) => i.type === 'evidence')
  )
  const [expanded, setExpanded] = useState(false)

  const { setQaDecision } = useResponses()

  // Keep in sync when parent refreshes this row
  useEffect(() => {
    setResponse(initialResponse)
    setEvidenceImages(initialResponse.images.filter((i) => i.type === 'evidence'))
    if (initialResponse.qaRemarks) {
      setRemarkText(initialResponse.qaRemarks)
    }
  }, [initialResponse.id, initialResponse.qaRemarks, initialResponse.qaDecision, initialResponse.images])

  const saveDecision = async (decision: QADecision, remark?: string) => {
    const effectiveRemark = (remark ?? remarkText).trim()

    if (decision !== 'approved' && !effectiveRemark) {
      setPendingDecision(decision)
      toast.error('Type your remark below, then tap Revision or Reject again to save.')
      return
    }

    if (
      response.qaDecision === decision &&
      (response.qaRemarks || '').trim() === effectiveRemark
    ) {
      toast.success('Already saved.')
      setPendingDecision(null)
      return
    }

    setIsSaving(true)
    setPendingDecision(null)
    try {
      const updated = await setQaDecision(
        response.id,
        decision,
        effectiveRemark || undefined
      )
      const merged = { ...response, ...updated, qaRemarks: effectiveRemark || updated.qaRemarks }
      setResponse(merged as InspectionResponse)
      setRemarkText(effectiveRemark || merged.qaRemarks || '')
      onQaComment(effectiveRemark || merged.qaRemarks || '')
      onResponseUpdate?.(merged)
      toast.success(
        decision === 'approved'
          ? 'Task approved'
          : decision === 'revision_required'
          ? 'Sent for revision'
          : 'Task rejected'
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save decision'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDecisionClick = (decision: QADecision, e: React.MouseEvent) => {
    e.stopPropagation()
    saveDecision(decision)
  }

  const handleEvidenceAdd = async (file: File, base64: string) => {
    const localImg: SnagImage = {
      id: generateId(),
      inspectionId,
      responseId: response.id,
      type: 'evidence',
      url: base64,
      caption: '',
      uploadedAt: new Date().toISOString(),
      isLocal: true,
      localBlob: base64,
    }
    setEvidenceImages((prev) => [...prev, localImg])

    const fd = new FormData()
    fd.append('file', file)
    fd.append('inspectionId', inspectionId)
    fd.append('responseId', response.id)
    fd.append('type', 'evidence')
    try {
      const { data } = await imagesApi.upload(fd)
      setEvidenceImages((prev) =>
        prev.map((i) =>
          i.id === localImg.id
            ? { ...i, url: data.url, thumbnailUrl: data.thumbnailUrl, isLocal: false }
            : i
        )
      )
      toast.success('Photo uploaded')
    } catch {
      await queueChange('upload_image', {
        imageId: localImg.id,
        inspectionId,
        responseId: response.id,
        base64,
        type: 'evidence',
      })
      onResponseUpdate?.({ images: [...response.images, localImg] })
      toast.success('Photo saved offline — will upload when back online')
    }
  }

  const handleEvidenceRemove = (imgId: string) => {
    setEvidenceImages((prev) => prev.filter((i) => i.id !== imgId))
  }

  const engineerImages = response.images.filter((i) => i.type !== 'evidence')
  const allDisplayImages = [...engineerImages, ...evidenceImages]
  const hasImages = allDisplayImages.length > 0
  const resolvedUrls = allDisplayImages.map(
    (i) => i.localBlob || resolveMediaUrl(i.url) || ''
  )

  const currentDecision = response.qaDecision as QADecision | undefined
  const remarkRequired = pendingDecision !== null || currentDecision === 'revision_required' || currentDecision === 'rejected'

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white transition-all',
        currentDecision === 'approved'
          ? 'border-green-200'
          : currentDecision === 'rejected'
          ? 'border-red-200'
          : currentDecision === 'revision_required'
          ? 'border-amber-300'
          : 'border-slate-200'
      )}
    >
      <div
        className="flex cursor-pointer items-start gap-3 p-4"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">
              {index}. {label}
            </span>
            {currentDecision && DECISION_CONFIG[currentDecision].badge}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge status={response.status} />
            {hasImages && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIndex(0)
                  setLightboxOpen(true)
                }}
                className="flex items-center gap-1 text-xs font-medium text-primary touch-manipulation"
              >
                <Camera size={13} aria-hidden="true" />
                {allDisplayImages.length} photo{allDisplayImages.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
          {response.qaRemarks && !expanded && (
            <p className="mt-1 line-clamp-2 text-xs text-amber-700">{response.qaRemarks}</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={18} className="mt-0.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown size={18} className="mt-0.5 shrink-0 text-slate-400" />
        )}
      </div>

      {expanded && (
        <div className="space-y-3 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
          {response.remarks && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-500">Engineer: </span>
              {response.remarks}
            </div>
          )}

          {/* Remark first — type before tapping Revision/Reject */}
          {!readOnly && (
            <div>
              <label
                htmlFor={`qa-remark-${response.id}`}
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                QA Remark {remarkRequired ? '(required for Revision/Reject)' : '(optional for Approve)'}
              </label>
              <Textarea
                id={`qa-remark-${response.id}`}
                value={remarkText}
                onChange={(e) => {
                  setRemarkText(e.target.value)
                  onQaComment(e.target.value)
                }}
                placeholder="Describe what needs to be corrected…"
                rows={3}
                className={cn(
                  'w-full text-sm',
                  remarkRequired && !remarkText.trim() && 'border-amber-400'
                )}
              />
              {pendingDecision && !remarkText.trim() && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Add remark above, then tap {DECISION_CONFIG[pendingDecision].label} again to save.
                </p>
              )}
            </div>
          )}

          {/* Evidence photos — available for in-progress and formal review */}
          {!readOnly && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">
                QA Evidence Photos (optional)
              </p>
              <div className="rounded-xl bg-slate-50 p-3">
                <ImageUploader
                  images={evidenceImages}
                  onAdd={handleEvidenceAdd}
                  onRemove={handleEvidenceRemove}
                  maxImages={5}
                />
              </div>
            </div>
          )}

          {!readOnly && (
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DECISION_CONFIG) as QADecision[]).map((d) => {
                const cfg = DECISION_CONFIG[d]
                const isActive = currentDecision === d
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={isSaving}
                    onClick={(e) => handleDecisionClick(d, e)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-bold transition-all touch-manipulation active:scale-[0.96]',
                      isActive
                        ? cfg.active
                        : pendingDecision === d
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-slate-50 text-slate-500 active:bg-slate-100'
                    )}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          )}

          {currentDecision === 'revision_required' && response.qaRemarks && (
            <p className="text-xs text-green-700 font-medium">
              Saved — engineer will see this in QA Feedback Log.
            </p>
          )}
        </div>
      )}

      {lightboxOpen && resolvedUrls.length > 0 && (
        <Lightbox
          images={resolvedUrls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
