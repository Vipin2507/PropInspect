import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { reviewsApi } from '../../utils/api'
import { queueChange } from '../../utils/sync'
import { cacheReviewDetailImages } from '../../utils/imageCache'
import { readLsCache, writeLsCache } from '../../utils/offlineCache'
import { ReviewChecklist } from '../../components/review/ReviewChecklist'
import { ReviewActions } from '../../components/review/ReviewActions'
import { Lightbox } from '../../components/ui/Lightbox'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'
import type { Inspection } from '../../types'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/Badge'
import { ArrowLeft, Info } from 'lucide-react'
import { ROUTES } from '../../constants/routes'
import { Drawer } from '../../components/ui/Drawer'
import { useMotionSafe } from '../../hooks/useMotionSafe'
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

  const persistReviewCache = (next: NonNullable<typeof data>) => {
    if (!inspectionId) return
    writeLsCache(`review_detail_${inspectionId}`, next)
  }

  const handleResponseUpdate = (responseId: string, updated: Partial<Inspection['responses'][0]>) => {
    setData((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        inspection: {
          ...prev.inspection,
          responses: prev.inspection.responses.map((r) =>
            r.id === responseId ? { ...r, ...updated } : r
          ),
        },
      }
      persistReviewCache(next)
      return next
    })
  }

  useEffect(() => {
    if (!inspectionId) return
    const cacheKey = `review_detail_${inspectionId}`
    let cancelled = false

    setLoading(true)
    setLoadError(null)

    try {
      const cached = readLsCache<typeof data>(cacheKey)
      if (cached) {
        setData(cached)
        setItemComments({})
        setLoading(false)
      }
    } catch { /* ignore parse errors */ }

    reviewsApi.get(inspectionId)
      .then(({ data: fresh }) => {
        if (cancelled) return
        writeLsCache(cacheKey, fresh)
        cacheReviewDetailImages(fresh as { inspection: Inspection })
        setData(fresh as typeof data)
        setItemComments({})
        setIsOffline(false)
        setLoadError(null)
        // Mark QA review started / resumed (server-side idle check)
        reviewsApi.start(inspectionId).catch(() => {})
      })
      .catch(async (err: { response?: { status?: number; data?: { error?: string } } }) => {
        if (cancelled) return
        const hadCache = !!readLsCache(cacheKey)
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
          writeLsCache(`review_detail_${inspectionId}`, fresh)
          cacheReviewDetailImages(fresh as { inspection: Inspection })
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

  const { fadeUp } = useMotionSafe()
  const backLinkClass =
    'inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors duration-fast hover:text-brand-600 touch-manipulation'

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (loadError && !data) {
    return (
      <motion.div className="space-y-3 py-6" {...fadeUp}>
        <Link to={ROUTES.QA_REVIEWS} className={backLinkClass}>
          <ArrowLeft size={14} aria-hidden="true" />
          Reviews
        </Link>
        <EmptyState title="Review not found" description={loadError} className="py-10" />
        <Button
          size="sm"
          className="mx-auto w-full max-w-xs !min-h-[36px] text-xs"
          onClick={() => navigate(ROUTES.QA_REVIEWS)}
        >
          Back to queue
        </Button>
      </motion.div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  const isFormalReview = data.inspection.status === 'submitted'
  const canReviewTasks = ['draft', 'submitted', 'revision_required'].includes(
    data.inspection.status
  )

  return (
    <motion.div
      className={cn('space-y-3', isFormalReview ? 'pb-[150px] md:pb-4' : 'pb-4')}
      {...fadeUp}
    >
      <Link to={ROUTES.QA_REVIEWS} className={backLinkClass}>
        <ArrowLeft size={14} aria-hidden="true" />
        Reviews
      </Link>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <h1 className="truncate font-display text-lg font-bold text-ink-950 md:text-xl">
            {data.flatNumber}
          </h1>
          <StatusBadge status={data.inspection.status} />
        </div>
        <p className="mt-0.5 text-[11px] text-ink-400">
          {isFormalReview ? 'Submitted' : 'In progress'} by {data.engineerName}
        </p>
        {!isFormalReview && canReviewTasks && (
          <div className="mt-2 flex items-start gap-2 rounded-md bg-info-100 px-2.5 py-2">
            <Info size={13} className="mt-0.5 shrink-0 text-info-600" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed text-info-600">
              Expand a task, add a remark, then tap <strong>Revision</strong>. Photos optional before
              save.
            </p>
          </div>
        )}
        {!canReviewTasks && (
          <p className="mt-2 rounded-md bg-ink-50 px-2.5 py-2 text-[11px] text-ink-600">
            This inspection is closed for editing.
          </p>
        )}
        {isOffline && (
          <p className="mt-1.5 text-[11px] font-medium text-warning-600">
            Showing cached data — connect to submit
          </p>
        )}
      </div>

      <ReviewChecklist
        responses={data.inspection.responses}
        inspectionId={data.inspection.id}
        itemComments={itemComments}
        onItemCommentChange={(id, value) => setItemComments((c) => ({ ...c, [id]: value }))}
        onResponseUpdate={canReviewTasks ? handleResponseUpdate : undefined}
        onImageClick={setLightboxImage}
        readOnly={!canReviewTasks}
        taskReviewOnly={!isFormalReview}
      />

      {isFormalReview && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-100 bg-surface/95 px-3 pt-2 pb-safe backdrop-blur-sm lg:left-52">
            <div className="mx-auto max-w-2xl">
              <Textarea
                value={overallComments}
                onChange={(e) => setOverallComments(e.target.value)}
                rows={1}
                className="mb-2 !min-h-[36px] !px-2.5 !py-1.5 text-sm resize-none"
                placeholder="Overall comments (required for revision/rejection)…"
                onFocus={(e) => {
                  e.target.rows = 3
                }}
                onBlur={(e) => {
                  if (!overallComments) e.target.rows = 1
                }}
              />
              <ReviewActions
                onApprove={() => submitReview('approved')}
                onRevision={() => setRevisionDrawerOpen(true)}
                onReject={() => submitReview('rejected')}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>

          <Drawer
            isOpen={revisionDrawerOpen}
            onClose={() => setRevisionDrawerOpen(false)}
            title="Request Revision"
          >
            <p className="mb-3 text-xs text-ink-600">
              Provide clear comments so the engineer knows what to fix.
            </p>
            <Textarea
              value={overallComments}
              onChange={(e) => setOverallComments(e.target.value)}
              rows={4}
              placeholder="e.g. Paint touch-up needed in master bedroom…"
              className="!px-2.5 !py-2 text-sm"
            />
            <Button
              className="mt-3 w-full"
              size="sm"
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
    </motion.div>
  )
}
