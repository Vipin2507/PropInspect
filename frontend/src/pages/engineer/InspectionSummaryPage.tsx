import { useParams, useNavigate, Link } from 'react-router-dom'
import { useInspection } from '../../hooks/useInspection'
import { useEffect, useState } from 'react'
import { flatsApi } from '../../utils/api'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { InspectionSummary } from '../../components/inspection/InspectionSummary'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { Flat } from '../../types'
import { Spinner } from '../../components/ui/Spinner'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { ROUTES } from '../../constants/routes'
import { cn } from '../../utils/cn'
import { useIsMobile } from '../../hooks/useBreakpoint'

export default function InspectionSummaryPage() {
  const { flatId } = useParams<{ flatId: string }>()
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()
  const [flat, setFlat]               = useState<Flat | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const { inspection, loading, submit }   = useInspection(flatId)

  useEffect(() => {
    if (flatId) flatsApi.get(flatId).then(({ data }) => setFlat(data))
  }, [flatId])

  if (loading || !inspection || !flat) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const doneCount    = inspection.responses.filter((r) => r.status !== 'pending').length
  const totalCount   = inspection.responses.length
  const pendingCount = totalCount - doneCount
  const completionPct = inspection.completionPct ?? (totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0)
  const allDone      = completionPct === 100

  const handleSubmit = async () => {
    await submit()
    navigate(ROUTES.ENGINEER_FLATS)
  }

  // Req 4.1 — submission only allowed when allDone
  const confirmMessage = allDone
    ? 'Once submitted, you cannot edit this inspection until the QA checker responds.'
    : `${pendingCount} item${pendingCount !== 1 ? 's' : ''} still pending. Complete all tasks before submitting.`

  // Responses that the Checker flagged for revision (after re-open)
  const revisionResponses = inspection.responses.filter((r) => r.qaDecision === 'revision_required')

  return (
    <div className="flex flex-col gap-4 pb-32 md:pb-6">
      <Link
        to={ROUTES.ENGINEER_FLAT(flatId!)}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Flat Details
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Inspection Summary</h1>
        <p className="text-sm text-slate-500">{flat.flatNumber} · {flat.towerName}</p>
      </div>

      {/* Progress card */}
      <div className="flex flex-col items-center gap-5 rounded-2xl bg-white p-6 shadow-sm md:flex-row">
        <ProgressRing pct={completionPct} size={isMobile ? 88 : 112} strokeWidth={10} />
        <div className="text-center md:text-left">
          <h2 className="text-lg font-bold text-slate-800">
            {allDone ? '✓ All Items Completed' : 'Partially Complete'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {doneCount} of {totalCount} items evaluated
          </p>
          {!allDone && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-amber-600">
              <AlertCircle size={14} aria-hidden="true" />
              {pendingCount} item{pendingCount !== 1 ? 's' : ''} still pending
            </p>
          )}
        </div>
      </div>

      {/* Req 4.2 — hard warning when not 100%: submission blocked */}
      {!allDone && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-red-800">Submission blocked</p>
            <p className="mt-0.5 text-sm text-red-700">
              {pendingCount} item{pendingCount !== 1 ? 's' : ''} still pending. Complete all checklist items before submitting.
            </p>
          </div>
        </div>
      )}

      {/* Req 6.3 — show QA revision remarks when inspection is revision_required */}
      {inspection.status === 'revision_required' && revisionResponses.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-bold text-amber-800">Tasks requiring revision:</p>
          <ul className="space-y-2">
            {revisionResponses.map((r) => (
              <li key={r.id} className="text-sm text-amber-700">
                <span className="font-semibold">{r.itemId}</span>
                {r.qaRemarks ? ` — ${r.qaRemarks}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Category breakdown */}
      <h3 className="text-base font-bold text-slate-800">Category Progress</h3>
      <InspectionSummary responses={inspection.responses} flatId={flatId!} />

      {/* Submit bar — only enabled when allDone (Req 4.1) */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 pb-safe backdrop-blur-sm',
        'md:relative md:bottom-auto md:left-auto md:right-auto md:border-none md:bg-transparent md:p-0'
      )}>
        <Button
          className="mx-auto w-full max-w-md"
          onClick={() => setIsConfirmOpen(true)}
          disabled={!allDone}
          title={!allDone ? `Complete all ${pendingCount} remaining tasks first` : undefined}
        >
          Submit for QA Review
        </Button>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={allDone ? 'Submit Inspection?' : 'Submit Incomplete Inspection?'}
        message={confirmMessage}
        confirmLabel="Yes, Submit"
        onConfirm={handleSubmit}
      />
    </div>
  )
}
