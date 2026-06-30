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
import { EmptyState } from '../../components/ui/EmptyState'
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
  const [itemComments, setItemComments]       = useState<Record<string, string>>({})
  const [overallComments, setOverallComments] = useState('')
  const [lightboxImage, setLightboxImage]     = useState<string | null>(null)
  const [revisionDrawerOpen, setRevisionDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting]       = useState(false)
  const [loading, setLoading]                   = useState(true)
  const [loadError, setLoadError]               = useState<string | null>(null)

  const [isOffline, setIsOffline] = useState(false)

  const handleResponseUpdate = (responseId: string, updated: Partial<Inspection['responses'][0]>) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        inspection: {
          ...prev.inspection,
          responses: prev.inspection.responses.map((r) =>
            r.id === responseId ? { ...r, ...updated } : r
          ),
        },
      }
    })
  }

  useEffect(() => {
    if (!inspectionId) return
    const cacheKey = `review_detail_${inspectionId}`
    let cancelled = false

    setLoading(true)
    setLoadError(null)

    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setData(JSON.parse(cached))
        setItemComments({})
        setLoading(false)
      }
    } catch { /* ignore parse errors */ }

    reviewsApi.get(inspectionId)
      .then(({ data: fresh }) => {
        if (cancelled) return
        localStorage.setItem(cacheKey, JSON.stringify(fresh))
        setData(fresh as typeof data)
        setItemComments({})
        setIsOffline(false)
        setLoadError(null)
      })
      .catch(async (err: { response?: { status?: number; data?: { error?: string } } }) => {
        if (cancelled) return
        const hadCache = !!localStorage.getItem(cacheKey)
        if (hadCache) {
          setIsOffline(true)
          return
        }

        // Legacy links used flat_id instead of inspection_id
        if (err?.response?.status === 404) {
          try {
            const { flatsApi, inspectionsApi } = await import('../../utils/api')
            const { saveSingleFlat, saveInspection } = await import('../../utils/storage')
            const { data: flat } = await flatsApi.get(inspectionId)
            await saveSingleFlat(flat)
            const realId = flat.inspection?.id
            if (realId && realId !== inspectionId) {
              navigate(ROUTES.QA_REVIEW_DETAIL(realId), { replace: true })
              return
            }
            const { data: insp } = await inspectionsApi.getByFlat(inspectionId)
            await saveInspection(insp)
            if (insp.id !== inspectionId) {
              navigate(ROUTES.QA_REVIEW_DETAIL(insp.id), { replace: true })
              return
            }
          } catch { /* fall through */ }
        }

        setLoadError(err?.response?.data?.error || 'Could not load this review')
        setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [inspectionId, navigate])

  const submitReview = async (decision: 'approved' | 'revision_required' | 'rejected') => {
    if (!inspectionId || !data) return
    if (decision !== 'approved' && !overallComments.trim()) {
      toast.error('Overall comments are required for revision or rejection.')
      return
    }
    setIsSubmitting(true)

    const itemCommentsPayload: Record<string, string> = { ...itemComments }
    for (const r of data.inspection.responses) {
      if (r.qaRemarks?.trim() && !itemCommentsPayload[r.itemId]) {
        itemCommentsPayload[r.itemId] = r.qaRemarks.trim()
      }
    }

    try {
      await reviewsApi.submit({
        inspectionId,
        decision,
        overallComments,
        itemComments: itemCommentsPayload,
      })
      localStorage.removeItem(`review_detail_${inspectionId}`)
      toast.success(`Inspection ${decision.replace('_', ' ')}.`)
      navigate(ROUTES.QA_REVIEWS)
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: string } }
        message?: string
        code?: string
      }
      const status = axiosErr?.response?.status
      const serverMsg = axiosErr?.response?.data?.error
      const isNetwork =
        !status ||
        status >= 500 ||
        axiosErr?.code === 'ERR_NETWORK' ||
        axiosErr?.message === 'Network Error'

      if (isNetwork) {
        try {
          await queueChange('review_decision', {
            inspectionId,
            decision,
            overallComments,
            itemComments: itemCommentsPayload,
          })
          toast.success('Review saved offline — will sync when back online')
          navigate(ROUTES.QA_REVIEWS)
        } catch {
          toast.error('Failed to save review offline. Please try again.')
        }
      } else {
        toast.error(serverMsg || 'Failed to submit review')
        try {
          const { data: fresh } = await reviewsApi.get(inspectionId)
          localStorage.setItem(`review_detail_${inspectionId}`, JSON.stringify(fresh))
          setData(fresh as typeof data)
          setIsOffline(false)
        } catch {
          setIsOffline(true)
        }
      }
    } finally {
      setIsSubmitting(false)
      setRevisionDrawerOpen(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (loadError && !data) {
    return (
      <div className="flex flex-col gap-4 py-8">
        <button
          type="button"
          onClick={() => navigate(ROUTES.QA_REVIEWS)}
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Back to Reviews
        </button>
        <EmptyState
          title="Review not found"
          description={loadError}
        />
        <Button className="mx-auto w-full max-w-xs" onClick={() => navigate(ROUTES.QA_REVIEWS)}>
          Back to queue
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const isFormalReview = data.inspection.status === 'submitted'

  return (
    <div className={cn('flex flex-col gap-4', isFormalReview ? 'pb-[160px] md:pb-6' : 'pb-6')}>
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
        <h1 className="text-xl font-bold text-slate-900">
          {isFormalReview ? 'Review' : 'View'}: {data.flatNumber}
        </h1>
        <p className="text-sm text-slate-500">
          {isFormalReview ? 'Submitted' : 'In progress'} by {data.engineerName}
        </p>
        {!isFormalReview && (
          <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">
            View-only — Approve/Reject/Revision is available after the engineer submits at 100%.
          </p>
        )}
        {isOffline && (
          <p className="mt-1 text-xs font-medium text-amber-600">
            ⚡ Showing cached data — connect to submit review
          </p>
        )}
      </div>

      <ReviewChecklist
        responses={data.inspection.responses}
        inspectionId={data.inspection.id}
        itemComments={itemComments}
        onItemCommentChange={(id, value) => setItemComments((c) => ({ ...c, [id]: value }))}
        onResponseUpdate={isFormalReview ? handleResponseUpdate : undefined}
        onImageClick={setLightboxImage}
        readOnly={!isFormalReview}
      />

      {isFormalReview && (
      <>
      {/* Fixed bottom actions panel — compact on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 pt-2 pb-safe backdrop-blur-sm lg:left-60">
        <div className="mx-auto max-w-2xl">
          {/* Overall comments — single line on mobile, expands on focus */}
          <Textarea
            value={overallComments}
            onChange={(e) => setOverallComments(e.target.value)}
            rows={1}
            className="mb-2 text-sm resize-none"
            placeholder="Overall comments (required for revision/rejection)…"
            onFocus={(e) => { e.target.rows = 3 }}
            onBlur={(e) => { if (!overallComments) e.target.rows = 1 }}
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
      </>
      )}

      {lightboxImage && (
        <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  )
}
