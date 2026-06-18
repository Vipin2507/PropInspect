import { useState } from 'react'
import { Badge } from '../ui/Badge'
import type { InspectionResponse, SnagImage } from '../../types'
import { Textarea } from '../ui/Textarea'
import { Camera, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { resolveMediaUrl, imagesApi } from '../../utils/api'
import { Lightbox } from '../ui/Lightbox'
import { useResponses } from '../../hooks/useResponses'
import { ImageUploader } from '../inspection/ImageUploader'
import toast from 'react-hot-toast'
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
}: {
  index: number
  label: string
  /** Current response (may be updated optimistically after decisions) */
  response: InspectionResponse
  inspectionId: string
  /** Called when the response is updated so the parent can merge the change */
  onResponseUpdate?: (updated: Partial<InspectionResponse>) => void
  /** Legacy per-item QA comment (kept for overall review payload) */
  qaComment: string
  onQaComment: (v: string) => void
}) {
  const [response, setResponse] = useState(initialResponse)
  const [remarkText, setRemarkText] = useState(response.qaRemarks || '')
  const [showRemarkInput, setShowRemarkInput] = useState(
    response.qaDecision === 'rejected' || response.qaDecision === 'revision_required'
  )
  const [isSaving, setIsSaving] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [evidenceImages, setEvidenceImages] = useState<SnagImage[]>(
    response.images.filter((i) => i.type === 'evidence')
  )
  const [expanded, setExpanded] = useState(false)

  const { setQaDecision } = useResponses()

  const handleDecision = async (decision: QADecision) => {
    // Toggle off if already selected
    if (response.qaDecision === decision) return

    if (decision !== 'approved' && !remarkText.trim()) {
      setShowRemarkInput(true)
      toast.error('Please add a remark before rejecting or requesting revision.')
      return
    }

    setIsSaving(true)
    try {
      const updated = await setQaDecision(response.id, decision, remarkText.trim() || undefined)
      const merged = { ...response, ...updated }
      setResponse(merged as InspectionResponse)
      onResponseUpdate?.(merged)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save decision'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEvidenceAdd = async (file: File, base64: string) => {
    // Optimistic local image
    const localImg: SnagImage = {
      id: crypto.randomUUID(),
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
    } catch {
      toast.error('Evidence photo upload failed')
      setEvidenceImages((prev) => prev.filter((i) => i.id !== localImg.id))
    }
  }

  const handleEvidenceRemove = (imgId: string) => {
    setEvidenceImages((prev) => prev.filter((i) => i.id !== imgId))
  }

  const allImages = response.images
  const hasImages = allImages.length > 0
  const resolvedUrls = allImages.map(
    (i) => i.localBlob || resolveMediaUrl(i.url) || ''
  )

  const currentDecision = response.qaDecision as QADecision | undefined

  return (
    <div className={cn(
      'rounded-2xl border bg-white transition-all',
      currentDecision === 'approved'
        ? 'border-green-200'
        : currentDecision === 'rejected'
        ? 'border-red-200'
        : currentDecision === 'revision_required'
        ? 'border-amber-300'
        : 'border-slate-200'
    )}>
      {/* ── Header row ── */}
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
                {allImages.length} photo{allImages.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="mt-0.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown size={18} className="mt-0.5 shrink-0 text-slate-400" />
        )}
      </div>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          {/* Engineer remarks */}
          {response.remarks && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-500">Engineer: </span>
              {response.remarks}
            </div>
          )}

          {/* Per-task decision buttons — Req 6.2 */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(DECISION_CONFIG) as QADecision[]).map((d) => {
              const cfg = DECISION_CONFIG[d]
              const isActive = currentDecision === d
              return (
                <button
                  key={d}
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setShowRemarkInput(d !== 'approved')
                    handleDecision(d)
                  }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-bold transition-all touch-manipulation active:scale-[0.96]',
                    isActive
                      ? cfg.active
                      : 'border-slate-200 bg-slate-50 text-slate-500 active:bg-slate-100'
                  )}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {/* Remark input — required for reject/revision (Req 6.3) */}
          {showRemarkInput && (
            <div>
              <label
                htmlFor={`qa-remark-${response.id}`}
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                QA Remark {currentDecision !== 'approved' ? '(required)' : '(optional)'}
              </label>
              <Textarea
                id={`qa-remark-${response.id}`}
                value={remarkText}
                onChange={(e) => {
                  setRemarkText(e.target.value)
                  onQaComment(e.target.value)
                }}
                placeholder={
                  currentDecision === 'revision_required'
                    ? 'Describe what needs to be corrected…'
                    : 'Reason for rejection…'
                }
                rows={2}
                className={cn(
                  'w-full text-sm',
                  currentDecision !== 'approved' && !remarkText.trim() && 'border-red-300'
                )}
              />
            </div>
          )}

          {/* Legacy overall QA comment (used in review payload) */}
          {!showRemarkInput && (
            <div>
              <label
                htmlFor={`qa-comment-${response.id}`}
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                QA Comment (optional)
              </label>
              <Textarea
                id={`qa-comment-${response.id}`}
                value={qaComment}
                onChange={(e) => onQaComment(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                className="w-full text-sm"
              />
            </div>
          )}

          {/* Evidence photos section — Req 7 */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500">Evidence Photos</p>
            <div className="rounded-xl bg-slate-50 p-3">
              <ImageUploader
                images={evidenceImages}
                onAdd={handleEvidenceAdd}
                onRemove={handleEvidenceRemove}
                maxImages={5}
              />
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for engineer-uploaded photos */}
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
