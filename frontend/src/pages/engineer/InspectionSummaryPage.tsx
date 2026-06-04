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
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [flat, setFlat] = useState<Flat | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const { inspection, loading, submit } = useInspection(flatId)

  useEffect(() => {
    if (flatId) flatsApi.get(flatId).then(({ data }) => setFlat(data))
  }, [flatId])

  if (loading || !inspection || !flat) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const doneCount = inspection.responses.filter((r) => r.status !== 'pending').length
  const totalCount = inspection.responses.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
  const canSubmit = progress === 100

  const handleSubmit = async () => {
    await submit()
    navigate(ROUTES.ENGINEER_FLATS)
  }

  return (
    <div className="pb-32 md:pb-6">
      <Link
        to={ROUTES.ENGINEER_FLAT(flatId!)}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
      >
        <ArrowLeft size={16} />
        Back to Flat Details
      </Link>

      <div className="text-center md:text-left">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Inspection Summary</h1>
        <p className="text-slate-500">
          {flat.flatNumber} | {flat.towerName} · {flat.floorLabel}
        </p>
      </div>

      <div className="my-6 flex flex-col items-center gap-6 rounded-xl bg-white p-6 shadow-sm md:flex-row">
        <div className="relative">
          <ProgressRing pct={progress} size={isMobile ? 90 : 120} strokeWidth={10} />
          {canSubmit && (
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle size={36} className="text-pass" />
            </div>
          )}
        </div>
        <div className="text-center md:text-left">
          <h2 className="text-xl font-bold text-slate-800">
            {canSubmit ? 'Ready to Submit' : 'In Progress'}
          </h2>
          <p className="text-slate-500">
            {doneCount} of {totalCount} checklist items completed.
          </p>
          {!canSubmit && (
            <p className="mt-1 text-sm text-amber-600">Complete all items to enable submission.</p>
          )}
        </div>
      </div>

      <h3 className="mb-3 text-lg font-bold text-slate-800">Category-wise Progress</h3>
      <InspectionSummary responses={inspection.responses} flatId={flatId!} />

      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/90 p-3 backdrop-blur-sm pb-safe',
          'md:relative md:mt-6 md:border-none md:bg-transparent md:p-0'
        )}
      >
        <Button
          className="mx-auto h-12 w-full max-w-md text-base"
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
        message="Once submitted, you cannot edit this inspection until the QA checker responds. Are you sure you want to proceed?"
        confirmLabel="Yes, Submit"
        onConfirm={handleSubmit}
      />
    </div>
  )
}
