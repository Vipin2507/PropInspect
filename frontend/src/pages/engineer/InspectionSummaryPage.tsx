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
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { ROUTES } from '../../constants/routes'
import { cn } from '../../utils/cn'
import { useIsMobile } from '../../hooks/useBreakpoint'

export default function InspectionSummaryPage() {
  const { flatId } = useParams<{ flatId: string }>()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const [flat, setFlat] = useState<Flat | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const { inspection, loading, submit } = useInspection(flatId)

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

  const doneCount  = inspection.responses.filter((r) => r.status !== 'pending').length
  const totalCount = inspection.responses.length
  const progress   = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
  const canSubmit  = progress === 100

  const handleSubmit = async () => {
    await submit()
    navigate(ROUTES.ENGINEER_FLATS)
  }

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
        <div className="relative">
          <ProgressRing pct={progress} size={isMobile ? 88 : 112} strokeWidth={10} />
          {canSubmit && (
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle size={32} className="text-pass" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="text-center md:text-left">
          <h2 className="text-lg font-bold text-slate-800">
            {canSubmit ? '✓ Ready to Submit' : 'In Progress'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {doneCount} of {totalCount} items completed
          </p>
          {!canSubmit && (
            <p className="mt-1 text-sm text-amber-600">
              Complete all items to enable submission.
            </p>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <h3 className="text-base font-bold text-slate-800">Category Progress</h3>
      <InspectionSummary responses={inspection.responses} flatId={flatId!} />

      {/* Fixed submit bar */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 pb-safe backdrop-blur-sm',
        'md:relative md:bottom-auto md:left-auto md:right-auto md:border-none md:bg-transparent md:p-0'
      )}>
        <Button
          className="mx-auto w-full max-w-md"
          onClick={() => setIsConfirmOpen(true)}
          disabled={!canSubmit}
        >
          Submit for QA Review
        </Button>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Submit Inspection?"
        message="Once submitted, you cannot edit this inspection until the QA checker responds."
        confirmLabel="Yes, Submit"
        onConfirm={handleSubmit}
      />
    </div>
  )
}
