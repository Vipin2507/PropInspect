import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, Wrench, CheckCircle2, PackageCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useInspection } from '../../hooks/useInspection'
import { useAuthStore } from '../../store/authStore'
import { useSnags } from '../../hooks/useSnags'
import { useFlatDetail } from '../../hooks/useFlatDetail'
import { useFlatHistory } from '../../hooks/useFlatHistory'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { InspectionSummary } from '../../components/inspection/InspectionSummary'
import { FlatHistoryTab } from '../../components/flat/FlatHistoryTab'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { ROUTES } from '../../constants/routes'
import { RevisionBanner } from '../../components/review/RevisionBanner'
import { Spinner } from '../../components/ui/Spinner'
import { DEFAULT_CHECKLIST_CATEGORIES, TOTAL_ITEMS } from '../../constants/checklist'
import { flatsApi } from '../../utils/api'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { AdminFlatStatusControl } from '../../components/admin/AdminFlatStatusControl'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'
import type { Flat } from '../../types'

type FlatTab = 'overview' | 'history'

const compactBtn = '!min-h-[40px] !px-3 !py-2 text-sm'
const fieldLabel = 'text-[10px] font-semibold uppercase tracking-wide text-ink-400'

export default function FlatDetail() {
  const { flatId } = useParams<{ flatId: string }>()
  const navigate = useNavigate()
  const { fadeUp, reduced } = useMotionSafe()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const isQA = user?.role === 'qa'
  const canHandover = isAdmin || isQA

  const [activeTab, setActiveTab] = useState<FlatTab>('overview')
  const { inspection, loading } = useInspection(flatId)
  const flatFromHook = useFlatDetail(flatId)
  const [flatOverride, setFlatOverride] = useState<Flat | null>(null)
  const flat = flatOverride ?? flatFromHook
  const { history, loading: historyLoading, error: historyError } = useFlatHistory(
    activeTab === 'history' ? flatId : undefined
  )
  const { snags } = useSnags({ flatId })
  const openSnagCount = snags.filter((s) =>
    ['open', 'assigned', 'in_rectification'].includes(s.status)
  ).length

  const [handoverConfirmOpen, setHandoverConfirmOpen] = useState(false)
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [flatStatus, setFlatStatus] = useState<string | null>(null)

  const currentFlatStatus = flatStatus ?? flat?.status

  const responses = inspection?.responses || []
  const totalCount = inspection?.totalItems ?? TOTAL_ITEMS
  const doneCount =
    inspection?.completedCount ?? responses.filter((r) => r.status !== 'pending').length
  const pendingCount = inspection?.pendingCount ?? Math.max(0, totalCount - doneCount)
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
  const completionPct = inspection?.completionPct ?? progress
  const isComplete = completionPct === 100 && pendingCount === 0

  const canMarkHandover =
    canHandover && (isAdmin || ['approved', 'desnagging'].includes(currentFlatStatus ?? ''))

  const handleHandover = async () => {
    if (!flatId) return
    setHandoverLoading(true)
    try {
      if (isAdmin && currentFlatStatus !== 'handed_over') {
        const { data } = await flatsApi.setStatus(flatId, 'handed_over')
        setFlatOverride(data)
        setFlatStatus('handed_over')
      } else {
        await flatsApi.handover(flatId)
        setFlatStatus('handed_over')
      }
      toast.success('Flat marked as Handed Over to Client')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to mark handover'
      toast.error(msg)
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

  const waitingForInspection = loading && !inspection
  if (waitingForInspection && !flat) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <motion.div className="space-y-3 pb-28 md:pb-4" {...fadeUp}>
      <Link
        to={ROUTES.ENGINEER_FLATS}
        className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors duration-fast hover:text-brand-600 touch-manipulation"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        All Flats
      </Link>

      {!isAdmin && inspection?.status === 'revision_required' && activeTab === 'overview' && (
        <RevisionBanner comments="Please address QA comments and resubmit." />
      )}

      {currentFlatStatus === 'handed_over' && (
        <Card className="flex items-center gap-2.5 border-accent-500/20 bg-accent-100/40 p-3 shadow-xs">
          <PackageCheck size={18} className="shrink-0 text-accent-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-accent-500">Handed Over to Client</p>
            <p className="text-[11px] text-accent-500/80">This flat has been delivered to the client.</p>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden p-3 shadow-xs md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-bold text-ink-950 md:text-xl">
              {flat?.flatNumber || `Flat ${flatId}`}
            </h1>
            {flat && (
              <p className="mt-0.5 truncate text-[11px] text-ink-400">
                {flat.towerName} · {flat.floorLabel}
              </p>
            )}
          </div>
          <StatusBadge status={currentFlatStatus ?? inspection?.status ?? 'not_started'} />
        </div>

        {canHandover && flat?.assignment && (
          <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-md bg-ink-50 p-2.5">
            <div>
              <p className={fieldLabel}>Engineer</p>
              <p className="mt-0.5 truncate text-xs font-medium text-ink-700">
                {flat.assignment.engineerName || '—'}
              </p>
            </div>
            <div>
              <p className={fieldLabel}>QA Reviewer</p>
              <p className="mt-0.5 truncate text-xs font-medium text-ink-700">
                {flat.assignment.qaName || '—'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'overview' && waitingForInspection && (
          <div className="mt-3 flex items-center justify-center gap-2 py-5 text-xs text-ink-500">
            <Spinner size="sm" />
            Loading inspection…
          </div>
        )}

        {totalCount > 0 && activeTab === 'overview' && !waitingForInspection && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              <span>Progress</span>
              <span className="tabular text-brand-600">{Math.round(completionPct)}%</span>
            </div>
            <ProgressBar pct={completionPct} />
            <p className="mt-1 text-[11px] text-ink-400">
              {doneCount} of {totalCount} items completed
            </p>
          </div>
        )}

        {!isAdmin &&
          !isQA &&
          isComplete &&
          inspection?.status === 'draft' &&
          activeTab === 'overview' && (
            <div className="mt-2.5 flex items-center gap-2 rounded-md border border-success-600/20 bg-success-100/40 px-2.5 py-2 text-xs font-medium text-success-600">
              <CheckCircle2 size={14} aria-hidden="true" />
              All items complete — ready to submit for QA
            </div>
          )}

        {isAdmin && flat && (
          <AdminFlatStatusControl
            flat={flat}
            onUpdated={(updated) => {
              setFlatOverride(updated)
              setFlatStatus(updated.status)
            }}
          />
        )}
      </Card>

      <SegmentedControl
        options={[
          { value: 'overview' as FlatTab, label: 'Overview' },
          { value: 'history' as FlatTab, label: 'History' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        layoutId="flat-detail-tab"
      />

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === 'overview' ? (
          <motion.div
            key="overview"
            className="space-y-3"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {!isAdmin && !isQA && openSnagCount > 0 && (
              <button
                type="button"
                onClick={() => navigate(ROUTES.ENGINEER_FLAT_SNAGS?.(flatId!) ?? ROUTES.DESNAGGING)}
                className="flex w-full items-center justify-between rounded-md border border-danger-600/20 bg-danger-100/40 px-3 py-2.5 text-left touch-manipulation active:bg-danger-100"
              >
                <div className="flex items-center gap-2">
                  <Wrench size={15} className="text-danger-600" aria-hidden="true" />
                  <span className="text-xs font-semibold text-danger-600">
                    {openSnagCount} open snag{openSnagCount !== 1 ? 's' : ''} need rectification
                  </span>
                </div>
                <span className="text-xs font-semibold text-danger-600">View →</span>
              </button>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Checklist
                </h2>
                {inspection && (
                  <span className="text-[11px] tabular text-ink-400">
                    {doneCount}/{totalCount}
                  </span>
                )}
              </div>
              {waitingForInspection ? (
                <Card className="flex items-center justify-center gap-2 py-10 text-xs text-ink-500 shadow-xs">
                  <Spinner size="sm" />
                  Loading inspection…
                </Card>
              ) : !inspection ? (
                <Card className="px-4 py-10 text-center shadow-xs">
                  <h3 className="text-sm font-semibold text-ink-800">No Inspection Started</h3>
                  <p className="mb-4 mt-1.5 text-xs text-ink-500">
                    {canHandover
                      ? 'The engineer has not started this inspection yet.'
                      : 'Start the inspection to fill in the checklist.'}
                  </p>
                  {!canHandover && (
                    <Button size="sm" onClick={startOrContinueInspection} className={cn(compactBtn, 'mx-auto')}>
                      Start Inspection
                    </Button>
                  )}
                </Card>
              ) : (
                <InspectionSummary responses={responses} flatId={flatId!} />
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <FlatHistoryTab history={history} loading={historyLoading} error={historyError} />
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'overview' && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-100 bg-surface/95 px-3 py-2.5 pb-safe backdrop-blur-sm md:relative md:bottom-auto md:left-auto md:right-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {canHandover && inspection && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(compactBtn, 'w-full')}
                  onClick={() => navigate(`/qa/reviews/${inspection.id}`)}
                >
                  <Eye size={15} aria-hidden="true" />
                  View Full Inspection
                </Button>

                {canMarkHandover && (
                  <Button
                    size="sm"
                    className={cn(compactBtn, 'w-full bg-accent-500 hover:brightness-95')}
                    onClick={() => setHandoverConfirmOpen(true)}
                    loading={handoverLoading}
                  >
                    <PackageCheck size={15} aria-hidden="true" />
                    Mark Handed Over
                  </Button>
                )}

                {currentFlatStatus === 'handed_over' && (
                  <p className="text-center text-[11px] font-medium text-accent-500">
                    Already handed over to client
                  </p>
                )}
              </>
            )}

            {!canHandover && inspection && totalCount > 0 && (
              <>
                <Button
                  size="sm"
                  onClick={startOrContinueInspection}
                  className={cn(compactBtn, 'w-full')}
                >
                  {progress > 0 ? 'Continue Inspection' : 'Start Inspection'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(compactBtn, 'w-full')}
                  onClick={() => navigate(ROUTES.ENGINEER_INSPECTION_SUMMARY(flatId!))}
                >
                  Summary &amp; Submit
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={handoverConfirmOpen}
        onOpenChange={setHandoverConfirmOpen}
        title="Mark as Handed Over to Client?"
        message={`This will mark flat ${flat?.flatNumber ?? ''} as delivered to the client. This action cannot be undone without admin override.`}
        confirmLabel="Yes, Mark Handed Over"
        onConfirm={handleHandover}
      />
    </motion.div>
  )
}
