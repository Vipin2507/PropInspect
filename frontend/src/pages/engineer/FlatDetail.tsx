import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, Wrench, CheckCircle2, PackageCheck } from 'lucide-react'
import { useInspection } from '../../hooks/useInspection'
import { useAuthStore } from '../../store/authStore'
import { useSnags } from '../../hooks/useSnags'
import { useFlatDetail } from '../../hooks/useFlatDetail'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { InspectionSummary } from '../../components/inspection/InspectionSummary'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ROUTES } from '../../constants/routes'
import { RevisionBanner } from '../../components/review/RevisionBanner'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import { flatsApi } from '../../utils/api'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function FlatDetail() {
  const { flatId }  = useParams<{ flatId: string }>()
  const navigate    = useNavigate()
  const user        = useAuthStore((s) => s.user)
  const isAdmin     = user?.role === 'admin'
  const isQA        = user?.role === 'qa'
  const canHandover = isAdmin || isQA

  const { inspection, loading } = useInspection(flatId)
  const flat = useFlatDetail(flatId)
  const { snags } = useSnags({ flatId })
  const openSnagCount = snags.filter((s) => ['open', 'assigned', 'in_rectification'].includes(s.status)).length

  const [handoverConfirmOpen, setHandoverConfirmOpen] = useState(false)
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [flatStatus, setFlatStatus] = useState<string | null>(null)

  // Use local state override once handover is done, so UI updates without refetch
  const currentFlatStatus = flatStatus ?? flat?.status

  const responses    = inspection?.responses || []
  const doneCount    = responses.filter((r) => r.status !== 'pending').length
  const totalCount   = responses.length
  const progress     = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
  const completionPct = inspection?.completionPct ?? progress
  const isComplete   = completionPct === 100

  const canMarkHandover = canHandover
    && ['approved', 'desnagging'].includes(currentFlatStatus ?? '')

  const handleHandover = async () => {
    if (!flatId) return
    setHandoverLoading(true)
    try {
      await flatsApi.handover(flatId)
      setFlatStatus('handed_over')
      toast.success('Flat marked as Handed Over to Client')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to mark handover')
    } finally {
      setHandoverLoading(false)
      setHandoverConfirmOpen(false)
    }
  }

  const startOrContinueInspection = () => {
    if (!flatId) return
    const firstIncomplete = DEFAULT_CHECKLIST_CATEGORIES.find((cat) => {
      const catResponses = responses.filter((r) => r.categoryId === cat.id)
      return catResponses.filter((r) => r.status !== 'pending').length < cat.items.length
    })
    const categoryId = firstIncomplete?.id ?? DEFAULT_CHECKLIST_CATEGORIES[0].id
    navigate(ROUTES.ENGINEER_CHECKLIST(flatId, categoryId))
  }

  const backLabel = isAdmin ? 'Back to All Flats' : 'Back to My Flats'

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-32 md:pb-6">
      <Link
        to={ROUTES.ENGINEER_FLATS}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        {backLabel}
      </Link>

      {!isAdmin && inspection?.status === 'revision_required' && (
        <RevisionBanner comments="Please address QA comments and resubmit." />
      )}

      {/* Handed Over banner */}
      {currentFlatStatus === 'handed_over' && (
        <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <PackageCheck size={22} className="shrink-0 text-teal-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-teal-800">Handed Over to Client</p>
            <p className="text-xs text-teal-600">This flat has been delivered to the client.</p>
          </div>
        </div>
      )}

      {/* Flat info card */}
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
              {flat?.flatNumber || `Flat ${flatId}`}
            </h1>
            {flat && (
              <p className="mt-0.5 text-sm text-slate-500">
                {flat.towerName} · {flat.floorLabel}
              </p>
            )}
          </div>
          {/* Show local status override if available */}
          <Badge status={currentFlatStatus ?? inspection?.status ?? 'not_started'} />
        </div>

        {/* Admin/QA: assignment info */}
        {canHandover && flat?.assignment && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Engineer</p>
              <p className="mt-0.5 font-medium text-slate-700">{flat.assignment.engineerName || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">QA Reviewer</p>
              <p className="mt-0.5 font-medium text-slate-700">{flat.assignment.qaName || '—'}</p>
            </div>
          </div>
        )}

        {totalCount > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-sm font-medium">
              <span className="text-slate-600">Overall Progress</span>
              <span className="font-semibold text-primary">{Math.round(completionPct)}%</span>
            </div>
            <ProgressBar pct={completionPct} />
            <p className="mt-1 text-xs text-slate-400">
              {doneCount} of {totalCount} checklist items completed
            </p>
          </div>
        )}

        {!isAdmin && !isQA && isComplete && inspection?.status === 'draft' && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            <CheckCircle2 size={16} aria-hidden="true" />
            All items complete — ready to submit for QA review!
          </div>
        )}
      </div>

      {/* Open snags */}
      {!isAdmin && !isQA && openSnagCount > 0 && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.ENGINEER_FLAT_SNAGS?.(flatId!) ?? ROUTES.DESNAGGING)}
          className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left touch-manipulation active:bg-red-100"
        >
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-fail" aria-hidden="true" />
            <span className="text-sm font-semibold text-fail">
              {openSnagCount} open snag{openSnagCount !== 1 ? 's' : ''} need rectification
            </span>
          </div>
          <span className="text-sm font-semibold text-fail">View →</span>
        </button>
      )}

      {/* Checklist summary */}
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-800 md:text-lg">Inspection Checklist</h2>
        {!inspection ? (
          <div className="rounded-2xl bg-white px-4 py-12 text-center shadow-sm">
            <h3 className="text-base font-semibold text-slate-800">No Inspection Started</h3>
            <p className="mb-6 mt-2 text-sm text-slate-500">
              {canHandover
                ? 'The engineer has not started this inspection yet.'
                : 'Start the inspection to fill in the checklist.'}
            </p>
            {!canHandover && (
              <Button onClick={startOrContinueInspection} className="mx-auto">
                Start Inspection
              </Button>
            )}
          </div>
        ) : (
          <InspectionSummary responses={responses} flatId={flatId!} />
        )}
      </div>

      {/* ── Bottom action bar ───────────────────────────────────────── */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 pb-safe backdrop-blur-sm',
        'md:relative md:bottom-auto md:left-auto md:right-auto md:border-none md:bg-transparent md:p-0'
      )}>
        <div className="mx-auto flex max-w-md flex-col gap-3">

          {/* Admin/QA: View inspection + Handover */}
          {canHandover && inspection && (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/qa/reviews/${inspection.id}`)}
              >
                <Eye size={18} aria-hidden="true" />
                View Full Inspection
              </Button>

              {canMarkHandover && (
                <Button
                  className="w-full bg-teal-600 active:bg-teal-700"
                  onClick={() => setHandoverConfirmOpen(true)}
                  loading={handoverLoading}
                >
                  <PackageCheck size={18} aria-hidden="true" />
                  Mark as Handed Over to Client
                </Button>
              )}

              {currentFlatStatus === 'handed_over' && (
                <p className="text-center text-sm font-medium text-teal-600">
                  ✓ Already handed over to client
                </p>
              )}
            </>
          )}

          {/* Engineer: continue / summary */}
          {!canHandover && inspection && totalCount > 0 && (
            <>
              <Button onClick={startOrContinueInspection} className="w-full">
                {progress > 0 ? 'Continue Inspection' : 'Start Inspection'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(ROUTES.ENGINEER_INSPECTION_SUMMARY(flatId!))}
              >
                Summary &amp; Submit
              </Button>
            </>
          )}

        </div>
      </div>

      {/* Handover confirm dialog */}
      <ConfirmDialog
        open={handoverConfirmOpen}
        onOpenChange={setHandoverConfirmOpen}
        title="Mark as Handed Over to Client?"
        message={`This will mark flat ${flat?.flatNumber ?? ''} as delivered to the client. This action cannot be undone without admin override.`}
        confirmLabel="Yes, Mark Handed Over"
        onConfirm={handleHandover}
      />
    </div>
  )
}
