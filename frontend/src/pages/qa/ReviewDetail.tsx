import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { reviewsApi } from '../../utils/api'
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
import { cn } from '../../utils/cn'

export default function ReviewDetail() {
  const { inspectionId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<{
    inspection: Inspection
    flatNumber: string
    engineerName: string
  } | null>(null)
  const [itemComments, setItemComments] = useState<Record<string, string>>({})
  const [overallComments, setOverallComments] = useState('')
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [isRevisionDrawerOpen, setRevisionDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (inspectionId) {
      reviewsApi.get(inspectionId).then(({ data }) => {
        setData(data as any)
        setItemComments({})
      })
    }
  }, [inspectionId])

  const submitReview = async (decision: 'approved' | 'revision_required' | 'rejected') => {
    if (!inspectionId) return
    if (decision !== 'approved' && !overallComments.trim()) {
      toast.error('Overall comments are required for revision or rejection.')
      return
    }
    setIsSubmitting(true)
    try {
      await reviewsApi.submit({
        inspectionId,
        decision,
        overallComments,
        itemComments,
      })
      toast.success(`Inspection has been ${decision.replace('_', ' ')}.`)
      navigate(ROUTES.QA_REVIEWS)
    } catch (err) {
      toast.error('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
      setRevisionDrawerOpen(false)
    }
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const bottomPanelPadding = 'pb-[220px] md:pb-0'

  return (
    <div className={cn('h-full', bottomPanelPadding)}>
      <div className="p-4 md:p-6">
        <button
          onClick={() => navigate(ROUTES.QA_REVIEWS)}
          className="mb-2 flex items-center gap-2 rounded-lg p-2 text-sm font-medium text-slate-600 active:bg-slate-100"
        >
          <ArrowLeft size={18} /> Back to Reviews
        </button>
        <h1 className="text-2xl font-bold">Review: {data.flatNumber}</h1>
        <p className="text-sm text-slate-500">
          Submitted by {data.engineerName}
        </p>
        <div className="mt-6">
          <ReviewChecklist
            responses={data.inspection.responses}
            itemComments={itemComments}
            onItemCommentChange={(id, value) =>
              setItemComments((c) => ({ ...c, [id]: value }))
            }
            onImageClick={setLightboxImage}
          />
        </div>
      </div>

      {/* Bottom Actions Panel */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/90 p-4 backdrop-blur-sm',
          'md:left-auto md:right-auto md:w-full', // Adjust for sidebar
          'lg:left-60' // Desktop with full sidebar
        )}
      >
        <div className="mx-auto max-w-4xl">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Overall Comments
          </label>
          <Textarea
            value={overallComments}
            onChange={(e) => setOverallComments(e.target.value)}
            rows={3}
            className="mb-3 mt-1"
            placeholder="Add overall comments for revision or rejection..."
          />
          <ReviewActions
            onApprove={() => submitReview('approved')}
            onRevision={() => setRevisionDrawerOpen(true)}
            onReject={() => submitReview('rejected')}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* Revision Drawer (Mobile) / Modal (Desktop) */}
      <Drawer
        isOpen={isRevisionDrawerOpen}
        onClose={() => setRevisionDrawerOpen(false)}
        title="Request Revision"
      >
        <div className="p-4">
          <p className="mb-3 text-sm text-slate-600">
            Provide clear comments for the engineer to address.
          </p>
          <Textarea
            value={overallComments}
            onChange={(e) => setOverallComments(e.target.value)}
            rows={5}
            placeholder="e.g., 'Paint touch-up needed in master bedroom...'" />
          <Button
            className="mt-4 w-full"
            onClick={() => submitReview('revision_required')}
            loading={isSubmitting}
          >
            Send for Revision
          </Button>
        </div>
      </Drawer>

      {lightboxImage && (
        <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  )
}
