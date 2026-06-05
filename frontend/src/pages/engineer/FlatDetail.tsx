import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { flatsApi } from '../../utils/api'
import { useInspection } from '../../hooks/useInspection'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { InspectionSummary } from '../../components/inspection/InspectionSummary'
import { Button } from '../../components/ui/Button'
import { ROUTES } from '../../constants/routes'
import { RevisionBanner } from '../../components/review/RevisionBanner'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import type { Flat } from '../../types'

export default function FlatDetail() {
  const { flatId } = useParams<{ flatId: string }>()
  const navigate = useNavigate()
  const { inspection, loading } = useInspection(flatId)
  const [flat, setFlat] = useState<Flat | null>(null)

  useEffect(() => {
    if (flatId) flatsApi.get(flatId).then(({ data }) => setFlat(data))
  }, [flatId])

  const responses  = inspection?.responses || []
  const doneCount  = responses.filter((r) => r.status !== 'pending').length
  const totalCount = responses.length
  const progress   = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  const startOrContinueInspection = () => {
    if (!flatId) return
    const firstIncomplete = DEFAULT_CHECKLIST_CATEGORIES.find((cat) => {
      const catResponses = responses.filter((r) => r.categoryId === cat.id)
      return catResponses.filter((r) => r.status !== 'pending').length < cat.items.length
    })
    const categoryId = firstIncomplete?.id ?? DEFAULT_CHECKLIST_CATEGORIES[0].id
    navigate(ROUTES.ENGINEER_CHECKLIST(flatId, categoryId))
  }

  if (loading || !inspection) {
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
        Back to My Flats
      </Link>

      {inspection.status === 'revision_required' && (
        <RevisionBanner comments="Please address QA comments and resubmit." />
      )}

      {/* Flat card */}
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
          Flat {flat?.flatNumber || flatId}
        </h1>
        {flat && (
          <p className="mt-0.5 text-sm text-slate-500">
            {flat.towerName} · {flat.floorLabel}
          </p>
        )}
        {totalCount > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-sm font-medium">
              <span className="text-slate-600">Overall Progress</span>
              <span className="font-semibold text-primary">{Math.round(progress)}%</span>
            </div>
            <ProgressBar pct={progress} />
          </div>
        )}
      </div>

      {/* Checklist summary */}
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-800 md:text-lg">Inspection Checklist</h2>
        {totalCount > 0 ? (
          <InspectionSummary responses={responses} flatId={flatId!} />
        ) : (
          <div className="rounded-2xl bg-white px-4 py-12 text-center shadow-sm">
            <h3 className="text-base font-semibold text-slate-800">No Inspection Started</h3>
            <p className="mb-6 mt-2 text-sm text-slate-500">
              Start the inspection to fill in the checklist.
            </p>
            <Button onClick={startOrContinueInspection} className="mx-auto">
              Start Inspection
            </Button>
          </div>
        )}
      </div>

      {/* Fixed bottom action bar */}
      {totalCount > 0 && (
        <div className={cn(
          'fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 pb-safe backdrop-blur-sm',
          'md:relative md:bottom-auto md:left-auto md:right-auto md:border-none md:bg-transparent md:p-0'
        )}>
          <div className="mx-auto flex max-w-md flex-col gap-3 md:flex-row">
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
          </div>
        </div>
      )}
    </div>
  )
}
