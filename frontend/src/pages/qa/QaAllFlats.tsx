import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useCheckerFlats } from '../../hooks/useCheckerFlats'
import { ROUTES } from '../../constants/routes'
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
  Building2, Search, Home, Clock, Send, AlertTriangle,
  CheckCircle, XCircle,
} from 'lucide-react'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'revision_required', label: 'Revision' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
] as const

type TabId = (typeof TABS)[number]['id']

const easeOut = [0.22, 1, 0.36, 1] as const

export default function QaAllFlats() {
  const [status, setStatus] = useState<TabId>('all')
  const [search, setSearch] = useState('')
  const { flats, loading } = useCheckerFlats({ search })
  const { fadeUp, reduced, stagger } = useMotionSafe()

  const counts = useMemo(
    () => ({
      all: flats.length,
      in_progress: flats.filter((f) => f.status === 'in_progress').length,
      submitted: flats.filter((f) => f.status === 'submitted').length,
      revision_required: flats.filter((f) => f.status === 'revision_required').length,
      approved: flats.filter((f) => f.status === 'approved').length,
      rejected: flats.filter((f) => f.status === 'rejected').length,
    }),
    [flats]
  )

  const filteredFlats = useMemo(() => {
    if (status === 'all') return flats
    return flats.filter((f) => f.status === status)
  }, [flats, status])

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
        <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">All Flats</h1>
        <p className="text-[11px] text-ink-400">
          {filteredFlats.length} shown · {flats.length} total
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatCard
          index={0}
          label="Total"
          value={counts.all}
          icon={Home}
          selected={status === 'all'}
          onClick={() => selectStat('all')}
        />
        <StatCard
          index={1}
          label="In Progress"
          value={counts.in_progress}
          icon={Clock}
          colorClass="text-brand-600 bg-brand-100"
          selected={status === 'in_progress'}
          onClick={() => selectStat('in_progress')}
        />
        <StatCard
          index={2}
          label="Submitted"
          value={counts.submitted}
          icon={Send}
          colorClass="text-warning-600 bg-warning-100"
          selected={status === 'submitted'}
          onClick={() => selectStat('submitted')}
        />
        <StatCard
          index={3}
          label="Revision"
          value={counts.revision_required}
          icon={AlertTriangle}
          colorClass="text-warning-600 bg-warning-100"
          selected={status === 'revision_required'}
          onClick={() => selectStat('revision_required')}
        />
        <StatCard
          index={4}
          label="Approved"
          value={counts.approved}
          icon={CheckCircle}
          colorClass="text-success-600 bg-success-100"
          selected={status === 'approved'}
          onClick={() => selectStat('approved')}
        />
        <StatCard
          index={5}
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
          title="No flats found"
          description={
            search
              ? 'Try a different search term.'
              : 'Flats appear here once engineers start inspections.'
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
              const engineerName = flat.engineerName || flat.inspection?.engineerName
              const pct = flat.completionPct ?? 0
              const unreviewed = flat.unreviewedChangeCount ?? 0

              return (
                <motion.div
                  key={flat.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={stagger(Math.min(i, 12))}
                >
                  <Link
                    to={
                      inspectionId
                        ? ROUTES.QA_REVIEW_DETAIL(inspectionId)
                        : ROUTES.QA_CHANGES
                    }
                    className="block touch-manipulation"
                  >
                    <Card
                      className={cn(
                        'overflow-hidden p-3 shadow-xs',
                        'transition-all duration-fast hover:border-brand-200 hover:shadow-sm active:scale-[0.99]',
                        unreviewed > 0 && 'border-warning-200/80'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                          <Building2 size={16} aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center justify-between gap-1.5">
                            <p className="truncate text-sm font-semibold text-ink-950">
                              {flat.flatNumber}
                            </p>
                            <StatusBadge status={flat.status} />
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-ink-400">
                            {flat.towerName || '—'}
                            {engineerName ? ` · ${engineerName}` : ''}
                          </p>
                          {unreviewed > 0 && (
                            <span className="mt-1 inline-flex rounded-full bg-warning-100 px-1.5 py-0.5 text-[10px] font-bold text-warning-600">
                              {unreviewed} new update{unreviewed === 1 ? '' : 's'}
                            </span>
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
