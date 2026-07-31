import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useCheckerFlats } from '../../hooks/useCheckerFlats'
import { ROUTES } from '../../constants/routes'
import { formatDistanceToNow, format } from 'date-fns'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Tabs } from '../../components/ui/Tabs'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'
import {
  Clock, Building2, Search, ClipboardCheck, Send,
  AlertTriangle, CheckCircle, XCircle, ChevronRight,
} from 'lucide-react'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Pending' },
  { id: 'revision_required', label: 'Revision' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
] as const

type TabId = (typeof TABS)[number]['id']

const SUBMITTED_STATUSES = ['submitted', 'revision_required', 'approved', 'rejected'] as const
const easeOut = [0.22, 1, 0.36, 1] as const

export default function PendingReviews() {
  const [status, setStatus] = useState<TabId>('all')
  const [search, setSearch] = useState('')
  const { flats, loading } = useCheckerFlats({ search })
  const { fadeUp, reduced, stagger } = useMotionSafe()

  const reviewFlats = useMemo(
    () => flats.filter((f) => SUBMITTED_STATUSES.includes(f.status as (typeof SUBMITTED_STATUSES)[number])),
    [flats]
  )

  const counts = useMemo(
    () => ({
      all: reviewFlats.length,
      submitted: reviewFlats.filter((f) => f.status === 'submitted').length,
      revision_required: reviewFlats.filter((f) => f.status === 'revision_required').length,
      approved: reviewFlats.filter((f) => f.status === 'approved').length,
      rejected: reviewFlats.filter((f) => f.status === 'rejected').length,
    }),
    [reviewFlats]
  )

  const filteredFlats = useMemo(() => {
    if (status === 'all') return reviewFlats
    return reviewFlats.filter((f) => f.status === status)
  }, [reviewFlats, status])

  const selectStat = (key: TabId) => {
    setStatus((prev) => (prev === key ? 'all' : key))
  }

  const tabItems = TABS.map((t) => ({
    value: t.id,
    label: t.label,
    count: counts[t.id],
  }))

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="min-w-0">
        <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Reviews</h1>
        <p className="text-[11px] text-ink-400">
          {filteredFlats.length} shown · {reviewFlats.length} submitted
          {counts.submitted > 0 ? ` · ${counts.submitted} pending` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatCard
          index={0}
          label="Total"
          value={counts.all}
          icon={ClipboardCheck}
          selected={status === 'all'}
          onClick={() => selectStat('all')}
        />
        <StatCard
          index={1}
          label="Pending"
          value={counts.submitted}
          icon={Send}
          colorClass="text-warning-600 bg-warning-100"
          selected={status === 'submitted'}
          onClick={() => selectStat('submitted')}
        />
        <StatCard
          index={2}
          label="Revision"
          value={counts.revision_required}
          icon={AlertTriangle}
          colorClass="text-warning-600 bg-warning-100"
          selected={status === 'revision_required'}
          onClick={() => selectStat('revision_required')}
        />
        <StatCard
          index={3}
          label="Approved"
          value={counts.approved}
          icon={CheckCircle}
          colorClass="text-success-600 bg-success-100"
          selected={status === 'approved'}
          onClick={() => selectStat('approved')}
        />
        <StatCard
          index={4}
          label="Rejected"
          value={counts.rejected}
          icon={XCircle}
          colorClass="text-danger-600 bg-danger-100"
          selected={status === 'rejected'}
          onClick={() => selectStat('rejected')}
        />
      </div>

      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search flat, tower, engineer…"
          className="w-full min-h-[40px] rounded-md border border-ink-200 bg-surface py-2 pl-9 pr-3 text-sm text-ink-950 outline-none transition-all duration-fast focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          style={{ fontSize: '16px' }}
        />
      </div>

      <div className="overflow-x-auto pb-0.5">
        <Tabs
          tabs={tabItems}
          value={status}
          onValueChange={(v) => setStatus(v as TabId)}
          className="min-w-max"
        />
      </div>

      {loading && filteredFlats.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filteredFlats.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No flats to review"
          description={
            search
              ? 'Try a different search term.'
              : 'Flats appear here once engineers submit them for review.'
          }
          className="py-10"
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${status}-${search}`}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            {filteredFlats.map((flat, i) => {
              const inspectionId = flat.inspectionId || flat.inspection?.id
              const submittedAt = flat.submittedAt || flat.inspection?.submittedAt
              const engineerName = flat.engineerName || flat.inspection?.engineerName
              const pct = flat.completionPct ?? 0
              const isPending = flat.status === 'submitted'

              return (
                <motion.div
                  key={flat.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={stagger(Math.min(i, 12))}
                >
                  <Link
                    to={inspectionId ? ROUTES.QA_REVIEW_DETAIL(inspectionId) : '#'}
                    className="group block touch-manipulation"
                  >
                    <Card
                      className={cn(
                        'relative overflow-hidden p-3 shadow-xs',
                        'transition-all duration-fast hover:border-brand-200 hover:shadow-sm active:scale-[0.99]',
                        isPending && 'border-warning-200/80 bg-warning-50/20'
                      )}
                    >
                      {isPending && (
                        <span
                          className="absolute inset-y-0 left-0 w-0.5 bg-warning-600"
                          aria-hidden
                        />
                      )}
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                          <Building2 size={16} aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center justify-between gap-1.5">
                            <p className="truncate text-sm font-semibold text-ink-950">
                              {flat.flatNumber}
                            </p>
                            <div className="flex shrink-0 items-center gap-1">
                              <StatusBadge status={flat.status} />
                              <ChevronRight
                                size={14}
                                className="text-ink-300 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-brand-500"
                                aria-hidden
                              />
                            </div>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-ink-400">
                            {flat.towerName || '—'}
                            {flat.floorLabel ? ` · ${flat.floorLabel}` : ''}
                            {engineerName ? ` · ${engineerName}` : ''}
                          </p>
                          {submittedAt && (
                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-400">
                              <Clock size={10} aria-hidden />
                              {formatDistanceToNow(new Date(submittedAt), { addSuffix: true })}
                              <span className="hidden sm:inline">
                                {' · '}
                                {format(new Date(submittedAt), 'dd MMM, h:mm a')}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                          <span>Progress</span>
                          <span className="tabular text-ink-600">{pct}%</span>
                        </div>
                        <ProgressBar pct={pct} />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
