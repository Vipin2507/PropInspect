import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
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

export default function FlatDetail() {
  const { flatId } = useParams<{ flatId: string }>()
  const navigate = useNavigate()
  const { inspection, loading } = useInspection(flatId)

  useEffect(() => {
    if (flatId) flatsApi.get(flatId).then(() => {})
  }, [flatId])

  const responses = inspection?.responses || []
  const doneCount = responses.filter((r) => r.status !== 'pending').length
  const totalCount = responses.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  const startOrContinueInspection = () => {
    if (!flatId) return
    const firstIncompleteCategory = DEFAULT_CHECKLIST_CATEGORIES.find((cat) => {
      const catResponses = responses.filter((r) => r.categoryId === cat.id)
      const done = catResponses.filter((r) => r.status !== 'pending').length
      return done < cat.items.length
    })
    const categoryId = firstIncompleteCategory?.id ?? DEFAULT_CHECKLIST_CATEGORIES[0].id
    navigate(ROUTES.ENGINEER_CHECKLIST(flatId, categoryId))
  }

  if (loading || !inspection) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="pb-32 md:pb-6">
      <Link
        to={ROUTES.ENGINEER_FLATS}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
      >
        <ArrowLeft size={16} />
        Back to My Flats
      </Link>

      {inspection.status === 'revision_required' && (
        <RevisionBanner comments="Please address QA comments and resubmit." />
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm md:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Flat {flatId}</h1>
        {totalCount > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm font-medium">
              <span className="text-slate-600">Overall Progress</span>
              <span className="font-semibold text-primary">{Math.round(progress)}%</span>
            </div>
            <ProgressBar pct={progress} />
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-slate-800">Inspection Checklist</h2>
        {totalCount > 0 ? (
          <InspectionSummary responses={responses} flatId={flatId!} />
        ) : (
          <div className="rounded-xl bg-white px-4 py-10 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">No Inspection Started</h3>
            <p className="mb-4 mt-2 text-slate-500">Start the inspection to see the checklist summary.</p>
            <Button onClick={startOrContinueInspection}>Start Inspection</Button>
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/90 p-3 backdrop-blur-sm pb-safe',
            'md:relative md:mt-6 md:border-none md:bg-transparent md:p-0'
          )}
        >
          <div className="mx-auto flex max-w-md flex-col gap-3 md:flex-row">
            <Button onClick={startOrContinueInspection} className="w-full">
              {progress > 0 ? 'Continue Inspection' : 'Start Inspection'}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(ROUTES.ENGINEER_INSPECTION_SUMMARY(flatId!))}
            >
              View Summary & Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
