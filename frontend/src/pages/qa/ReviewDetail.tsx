import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { reviewsApi } from '../../utils/api'
import { queueChange } from '../../utils/sync'
import { ReviewChecklist } from '../../components/review/ReviewChecklist'
import { ReviewActions } from '../../components/review/ReviewActions'
import { Lightbox } from '../../components/ui/Lightbox'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'
import type { Inspection } from '../../types'
import { Spinner } from '../../components/ui/Spinner'
import { ArrowLeft } from 'lucide-react'
import { ROUTES } from '../../constants/routes'
import { Drawer } from '../../components/ui/Drawer'

export default function ReviewDetail() {
  const { inspectionId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<{
    inspection: Inspection
    flatNumber: string
    engineerName: string
  } | null>(null)
  const [itemComments, setItemComments]       = useState<Record<string, string>>({})
  const [overallComments, setOverallComments] = useState('')
  const [lightboxImage, setLightboxImage]     = useState<string | null>(null)
  const [revisionDrawerOpen, setRevisionDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting]       = useState(false)

  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (!inspectionId) return
    const cacheKey = `review_detail_${inspectionId}`

    // 1. Serve from localStorage cache immediately (populated by prefetch)
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setData(JSON.parse(cached))
        setItemComments({})
      }
    } catch { /* ignore parse errors */ }

    // 2. Refresh from network in background
    reviewsApi.get(inspectionId)
      .then(({ data: fresh }) => {
        localStorage.setItem(cacheKey, JSON.stringify(fresh))
        setData(fresh as any)
        setItemComments({})
        setIsOffline(false)
      })
      .catch(() => {
        // Network failed — show offline indicator if serving from cache
        setIsOffline(true)
      })
  }, [inspectionId])

  const submitReview = async (decision: 'approved' | 'revision_required' | 'rejected') => {
    if (!inspectionId) return
    if (decision !== 'approved' && !overallComments.trim()) {
      toast.error('Overall comments are required for revision or rejection.')
      return
    }
    setIsSubmitting(true)
    try {
      await reviewsApi.submit({ inspectionId, decision, overallComments, itemComments })
      toast.success(`Inspection ${decision.replace('_', ' ')}.`)
      navigate(ROUTES.QA_REVIEWS)
    } catch {
      // Queue for sync when back online
      await queueChange('review_decision', { inspectionId, decision, overallComments, itemComments })
      toast.success('Review saved offline — will sync when back online')
      navigate(ROUTES.QA_REVIEWS)
    } finally {
      setIsSubmitting(false)
      setRevisionDrawerOpen(false)
    }
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-[300px] md:pb-6">
      {/* Header */}
      <button
        type="button"
        onClick={() => navigate(ROUTES.QA_REVIEWS)}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Reviews
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Review: {data.flatNumber}</h1>
        <p className="text-sm text-slate-500">Submitted by {data.engineerName}</p>
        {isOffline && (
          <p className="mt-1 text-xs font-medium text-amber-600">
            ⚡ Showing cached data — connect to submit review
          </p>
        )}
      </div>

      <ReviewChecklist
        responses={data.inspection.responses}
        itemComments={itemComments}
        onItemCommentChange={(id, value) => setItemComments((c) => ({ ...c, [id]: value }))}
        onImageClick={setLightboxImage}
      />

      {/* Fixed bottom actions panel */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-safe backdrop-blur-sm lg:left-60">
        <div className="mx-auto max-w-2xl">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Overall Comments
          </label>
          <Textarea
            value={overallComments}
            onChange={(e) => setOverallComments(e.target.value)}
            rows={2}
            className="mb-2 text-sm"
            placeholder="Add overall comments for revision or rejection…"
          />
          <ReviewActions
            onApprove={() => submitReview('approved')}
            onRevision={() => setRevisionDrawerOpen(true)}
            onReject={() => submitReview('rejected')}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* Revision drawer */}
      <Drawer
        isOpen={revisionDrawerOpen}
        onClose={() => setRevisionDrawerOpen(false)}
        title="Request Revision"
      >
        <p className="mb-4 text-sm text-slate-600">
          Provide clear comments so the engineer knows what to fix.
        </p>
        <Textarea
          value={overallComments}
          onChange={(e) => setOverallComments(e.target.value)}
          rows={5}
          placeholder="e.g. Paint touch-up needed in master bedroom…"
        />
        <Button
          className="mt-4 w-full"
          onClick={() => submitReview('revision_required')}
          loading={isSubmitting}
        >
          Send for Revision
        </Button>
      </Drawer>

      {lightboxImage && (
        <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  )
}
