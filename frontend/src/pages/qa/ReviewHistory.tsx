import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay } from 'date-fns'
import { useReviewHistory } from '../../hooks/useReviews'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Tabs } from '../../components/ui/Tabs'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { ROUTES } from '../../constants/routes'
import { cn } from '../../utils/cn'
import {
  History, Search, CheckCircle, XCircle, AlertTriangle,
  Building2, ChevronRight, ClipboardCheck,
} from 'lucide-react'

type HistoryItem = {
  id: string
  inspectionId?: string
  flatNumber: string
  engineerName?: string
  decision?: string
  status?: string
  reviewedAt?: string
  overallComments?: string
  towerName?: string
}

type FilterKey = 'all' | 'approved' | 'revision_required' | 'rejected'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'revision_required', label: 'Revision' },
  { id: 'rejected', label: 'Rejected' },
] as const

const easeOut = [0.22, 1, 0.36, 1] as const

function decisionOf(r: HistoryItem) {
  return r.decision || r.status || ''
}

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'dd MMM yyyy')
}

export default function ReviewHistory() {
  const { history, loading } = useReviewHistory()
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')

  const items = history as HistoryItem[]

  const counts = useMemo(() => {
    const approved = items.filter((h) => decisionOf(h) === 'approved').length
    const revision = items.filter((h) => decisionOf(h) === 'revision_required').length
    const rejected = items.filter((h) => decisionOf(h) === 'rejected').length
    return { all: items.length, approved, revision_required: revision, rejected }
  }, [items])

  const filtered = useMemo(() => {
    let list = items
    if (filter !== 'all') list = list.filter((h) => decisionOf(h) === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (h) =>
          h.flatNumber?.toLowerCase().includes(q) ||
          h.engineerName?.toLowerCase().includes(q) ||
          h.towerName?.toLowerCase().includes(q) ||
          h.overallComments?.toLowerCase().includes(q)
      )
    }
    return list
  }, [items, filter, search])

  const grouped = useMemo(() => {
    const map = new Map<string, HistoryItem[]>()
    for (const r of filtered) {
      if (!r.reviewedAt) {
        const key = 'unknown'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(r)
        continue
      }
      const d = startOfDay(new Date(r.reviewedAt))
      const key = d.toISOString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return [...map.entries()].map(([key, rows]) => ({
      key,
      label: key === 'unknown' ? 'Unknown date' : dayLabel(new Date(key)),
      items: rows,
    }))
  }, [filtered])

  const selectFilter = (key: FilterKey) => {
    setFilter((prev) => (prev === key ? 'all' : key))
  }

  const tabItems = TABS.map((t) => ({
    value: t.id,
    label: t.label,
    count: counts[t.id],
  }))

  let itemIndex = 0

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="min-w-0">
        <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">History</h1>
        <p className="text-[11px] text-ink-400">
          {filtered.length} shown · {items.length} reviewed
        </p>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            index={0}
            label="Total"
            value={counts.all}
            icon={History}
            selected={filter === 'all'}
            onClick={() => selectFilter('all')}
          />
          <StatCard
            index={1}
            label="Approved"
            value={counts.approved}
            icon={CheckCircle}
            colorClass="text-success-600 bg-success-100"
            selected={filter === 'approved'}
            onClick={() => selectFilter('approved')}
          />
          <StatCard
            index={2}
            label="Revision"
            value={counts.revision_required}
            icon={AlertTriangle}
            colorClass="text-warning-600 bg-warning-100"
            selected={filter === 'revision_required'}
            onClick={() => selectFilter('revision_required')}
          />
          <StatCard
            index={3}
            label="Rejected"
            value={counts.rejected}
            icon={XCircle}
            colorClass="text-danger-600 bg-danger-100"
            selected={filter === 'rejected'}
            onClick={() => selectFilter('rejected')}
          />
        </div>
      )}

      {items.length > 0 && (
        <>
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
              placeholder="Search flat, engineer, comments…"
              className="w-full min-h-[40px] rounded-md border border-ink-200 bg-surface py-2 pl-9 pr-3 text-sm text-ink-950 outline-none transition-all duration-fast focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div className="overflow-x-auto pb-0.5">
            <Tabs
              tabs={tabItems}
              value={filter}
              onValueChange={(v) => setFilter(v as FilterKey)}
              className="min-w-max"
            />
          </div>
        </>
      )}

      {loading && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No reviews yet"
          description="Completed reviews will appear here."
          className="py-10"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try a different filter or search."
          actionLabel="Clear"
          onAction={() => {
            setFilter('all')
            setSearch('')
          }}
          className="py-10"
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${filter}-${search}`}
            className="space-y-3"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            {grouped.map((group) => (
              <section key={group.key}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h2 className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                    {group.label}
                  </h2>
                  <span className="text-[11px] tabular text-ink-400">{group.items.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {group.items.map((r) => {
                    const i = itemIndex++
                    const decision = decisionOf(r)
                    const href = r.inspectionId
                      ? ROUTES.QA_REVIEW_DETAIL(r.inspectionId)
                      : undefined
                    const accent =
                      decision === 'approved'
                        ? 'bg-success-600'
                        : decision === 'rejected'
                          ? 'bg-danger-600'
                          : decision === 'revision_required'
                            ? 'bg-warning-600'
                            : 'bg-brand-500'

                    const inner = (
                      <Card
                        className={cn(
                          'relative overflow-hidden p-3 shadow-xs',
                          'transition-all duration-fast',
                          href && 'hover:border-brand-200 hover:shadow-sm active:scale-[0.99]'
                        )}
                      >
                        <span
                          className={cn('absolute inset-y-0 left-0 w-0.5', accent)}
                          aria-hidden
                        />
                        <div className="flex items-start gap-2.5 pl-0.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                            <Building2 size={16} aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center justify-between gap-1.5">
                              <p className="truncate text-sm font-semibold text-ink-950">
                                {r.flatNumber}
                              </p>
                              <div className="flex shrink-0 items-center gap-1">
                                {decision && <StatusBadge status={decision} />}
                                {href && (
                                  <ChevronRight
                                    size={14}
                                    className="text-ink-300"
                                    aria-hidden
                                  />
                                )}
                              </div>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-ink-400">
                              {r.engineerName ? `Eng: ${r.engineerName}` : '—'}
                              {r.reviewedAt
                                ? ` · ${formatDistanceToNow(new Date(r.reviewedAt), {
                                    addSuffix: true,
                                  })}`
                                : ''}
                            </p>
                            {r.overallComments && (
                              <p className="mt-1.5 line-clamp-2 rounded-md bg-ink-50 px-2 py-1.5 text-[12px] text-ink-600">
                                {r.overallComments}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    )

                    return (
                      <motion.div
                        key={r.id || `${r.flatNumber}-${r.reviewedAt}-${i}`}
                        layout={!reduced}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={stagger(Math.min(i, 12))}
                      >
                        {href ? (
                          <Link to={href} className="block touch-manipulation">
                            {inner}
                          </Link>
                        ) : (
                          inner
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
