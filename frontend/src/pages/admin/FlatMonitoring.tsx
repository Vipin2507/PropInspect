import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useFlats } from '../../hooks/useFlats'
import { useProjects } from '../../hooks/useProjects'
import { useTowers } from '../../hooks/useTowers'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { Select } from '../../components/ui/Select'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { ROUTES } from '../../constants/routes'
import { useSnags } from '../../hooks/useSnags'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'
import {
  AlertTriangle, ChevronRight, Building2, Home, Clock, Send,
  CheckCircle, RotateCcw, Search, MonitorDot,
} from 'lucide-react'
import type { Flat } from '../../types'

type StatusKey =
  | ''
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'revision_required'
  | 'rejected'

const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'revision_required', label: 'Revision' },
  { value: 'rejected', label: 'Rejected' },
]

const easeOut = [0.22, 1, 0.36, 1] as const
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'
const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'

export default function FlatMonitoring() {
  const navigate = useNavigate()
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const { projects } = useProjects()
  const [projectFilter, setProjectFilter] = useState('')
  const [towerFilter, setTowerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusKey>('')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { towers } = useTowers(projectFilter || null)
  const { flats, loading } = useFlats(projectFilter || undefined)
  const { snags } = useSnags({ projectId: projectFilter || undefined })

  useEffect(() => {
    setTowerFilter('')
  }, [projectFilter])

  const openSnagsByFlat = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of snags) {
      if (['open', 'assigned', 'in_rectification'].includes(s.status)) {
        map[s.flatId] = (map[s.flatId] || 0) + 1
      }
    }
    return map
  }, [snags])

  const counts = useMemo(() => {
    const c = {
      total: flats.length,
      not_started: 0,
      in_progress: 0,
      submitted: 0,
      approved: 0,
      revision_required: 0,
      rejected: 0,
      openSnags: Object.values(openSnagsByFlat).reduce((a, b) => a + b, 0),
    }
    for (const f of flats) {
      if (f.status in c) (c as Record<string, number>)[f.status]++
    }
    return c
  }, [flats, openSnagsByFlat])

  const filtered = useMemo(() => {
    let list = flats
    if (towerFilter) list = list.filter((f) => f.towerId === towerFilter)
    if (statusFilter) list = list.filter((f) => f.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (f) =>
          f.flatNumber?.toLowerCase().includes(q) ||
          f.towerName?.toLowerCase().includes(q) ||
          f.floorLabel?.toLowerCase().includes(q) ||
          f.inspection?.engineerName?.toLowerCase().includes(q) ||
          f.engineerName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [flats, towerFilter, statusFilter, search])

  const displayed = showAll ? filtered : filtered.slice(0, 24)

  const selectStatus = (key: StatusKey) => {
    setStatusFilter((prev) => (prev === key ? '' : key))
  }

  const handleRowTap = (flat: Flat) => {
    navigate(ROUTES.ENGINEER_FLAT(flat.id))
  }

  const activeFilterCount = [projectFilter, towerFilter, statusFilter, search].filter(Boolean).length

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Monitoring</h1>
          <p className="text-[11px] text-ink-400">
            {filtered.length} flat{filtered.length !== 1 ? 's' : ''}
            {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}` : ''}
            {counts.openSnags > 0 ? ` · ${counts.openSnags} open snags` : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant={filtersOpen ? 'primary' : 'outline'}
          className={compactBtn}
          onClick={() => setFiltersOpen((p) => !p)}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand-600">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard
          index={0}
          label="Total"
          value={counts.total}
          icon={Home}
          selected={!statusFilter}
          onClick={() => selectStatus('')}
        />
        <StatCard
          index={1}
          label="Pending"
          value={counts.not_started}
          icon={Clock}
          colorClass="text-ink-600 bg-ink-100"
          selected={statusFilter === 'not_started'}
          onClick={() => selectStatus('not_started')}
        />
        <StatCard
          index={2}
          label="In Progress"
          value={counts.in_progress}
          icon={Building2}
          colorClass="text-brand-600 bg-brand-100"
          selected={statusFilter === 'in_progress'}
          onClick={() => selectStatus('in_progress')}
        />
        <StatCard
          index={3}
          label="Submitted"
          value={counts.submitted}
          icon={Send}
          colorClass="text-warning-600 bg-warning-100"
          selected={statusFilter === 'submitted'}
          onClick={() => selectStatus('submitted')}
        />
        <StatCard
          index={4}
          label="Approved"
          value={counts.approved}
          icon={CheckCircle}
          colorClass="text-success-600 bg-success-100"
          selected={statusFilter === 'approved'}
          onClick={() => selectStatus('approved')}
        />
        <StatCard
          index={5}
          label="Revision"
          value={counts.revision_required}
          icon={RotateCcw}
          colorClass="text-warning-600 bg-warning-100"
          selected={statusFilter === 'revision_required'}
          onClick={() => selectStatus('revision_required')}
        />
        <StatCard
          index={6}
          label="Open Snags"
          value={counts.openSnags}
          icon={AlertTriangle}
          colorClass="text-danger-600 bg-danger-100"
          className="col-span-3 sm:col-span-1"
        />
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            key="filters"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: easeOut }}
            className="overflow-hidden"
          >
            <Card className="border-ink-100 bg-surface p-3 shadow-xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Filters
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectFilter('')
                      setTowerFilter('')
                      setStatusFilter('')
                      setSearch('')
                    }}
                    className="text-[11px] font-semibold text-danger-600 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <label className={fieldLabel}>Project</label>
                  <Select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    aria-label="Filter by project"
                  >
                    <option value="">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={fieldLabel}>Tower</label>
                  <Select
                    value={towerFilter}
                    onChange={(e) => setTowerFilter(e.target.value)}
                    aria-label="Filter by tower"
                    disabled={!projectFilter}
                  >
                    <option value="">All Towers</option>
                    {towers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={fieldLabel}>Status</label>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusKey)}
                    aria-label="Filter by status"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          aria-hidden
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

      {loading && flats.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MonitorDot}
          title="No flats found"
          description="Try adjusting your filters."
          className="py-10"
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${projectFilter}-${towerFilter}-${statusFilter}-${search}-${showAll}`}
            className="space-y-1.5"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            {/* Desktop table header */}
            <div className="hidden items-center gap-3 rounded-md border border-ink-100/80 bg-ink-50/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400 md:grid md:grid-cols-[1.2fr_120px_80px_1fr_16px]">
              <span>Flat</span>
              <span>Status</span>
              <span>Snags</span>
              <span>Engineer</span>
              <span />
            </div>

            {displayed.map((flat, i) => {
              const openSnags = openSnagsByFlat[flat.id] || 0
              const engineer =
                flat.inspection?.engineerName || flat.engineerName || '—'

              return (
                <motion.div
                  key={flat.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={stagger(Math.min(i, 12))}
                >
                  <button
                    type="button"
                    onClick={() => handleRowTap(flat)}
                    className="group w-full text-left touch-manipulation"
                  >
                    <Card
                      className={cn(
                        'overflow-hidden p-0 shadow-xs',
                        'transition-all duration-fast hover:border-brand-200 hover:shadow-sm active:scale-[0.99]',
                        openSnags > 0 && 'border-danger-200/70'
                      )}
                    >
                      {/* Mobile */}
                      <div className="flex items-center gap-2.5 p-3 md:hidden">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                          <Building2 size={16} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center justify-between gap-1.5">
                            <p className="truncate text-sm font-semibold text-ink-950">
                              {flat.flatNumber}
                            </p>
                            <StatusBadge status={flat.status} />
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-ink-400">
                            {flat.towerName} · {flat.floorLabel}
                            {engineer !== '—' ? ` · ${engineer}` : ''}
                          </p>
                          {openSnags > 0 && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-danger-600">
                              <AlertTriangle size={10} aria-hidden />
                              {openSnags} open snag{openSnags !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <ChevronRight
                          size={14}
                          className="shrink-0 text-ink-300 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-brand-500"
                          aria-hidden
                        />
                      </div>

                      {/* Desktop row */}
                      <div className="hidden items-center gap-3 px-3 py-2.5 md:grid md:grid-cols-[1.2fr_120px_80px_1fr_16px]">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-950">
                            {flat.flatNumber}
                          </p>
                          <p className="truncate text-[11px] text-ink-400">
                            {flat.towerName} · {flat.floorLabel}
                          </p>
                        </div>
                        <StatusBadge status={flat.status} />
                        <span
                          className={cn(
                            'text-sm font-semibold tabular',
                            openSnags > 0 ? 'text-danger-600' : 'text-ink-300'
                          )}
                        >
                          {openSnags > 0 ? openSnags : '—'}
                        </span>
                        <span className="truncate text-xs text-ink-600">{engineer}</span>
                        <ChevronRight
                          size={14}
                          className="text-ink-300 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-brand-500"
                          aria-hidden
                        />
                      </div>
                    </Card>
                  </button>
                </motion.div>
              )
            })}

            {filtered.length > 24 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="w-full rounded-md border border-ink-100 bg-surface py-2.5 text-center text-xs font-semibold text-brand-600 touch-manipulation hover:bg-brand-50/50"
              >
                {showAll ? 'Show less' : `View all ${filtered.length} flats →`}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
