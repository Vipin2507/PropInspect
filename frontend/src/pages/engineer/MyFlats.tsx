import { useState, useMemo, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2, Search, Clock, Send, AlertTriangle, CheckCircle, PackageCheck, Home,
} from 'lucide-react'
import { useFlats } from '../../hooks/useFlats'
import { useFlatProgressStore } from '../../store/flatProgressStore'
import { resolveFlatProgressPct } from '../../utils/completion'
import { useProjects } from '../../hooks/useProjects'
import { useAuthStore } from '../../store/authStore'
import { StatusBadge } from '../../components/ui/Badge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Select } from '../../components/ui/Select'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { Tabs } from '../../components/ui/Tabs'
import { ROUTES } from '../../constants/routes'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'revision', label: 'Revision' },
  { id: 'approved', label: 'Approved' },
  { id: 'handed_over', label: 'Handed Over' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function MyFlats() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const { fadeUp, reduced, stagger } = useMotionSafe()

  const { projects } = useProjects()
  const [projectFilter, setProjectFilter] = useState('')

  const { flats, loading, refresh } = useFlats(isAdmin && projectFilter ? projectFilter : undefined)
  const progressOverrides = useFlatProgressStore((s) => s.overrides)

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabId>('all')
  const location = useLocation()

  useEffect(() => {
    setTab(isAdmin ? 'all' : 'pending')
  }, [isAdmin])

  const counts = useMemo(
    () => ({
      all: flats.length,
      pending: flats.filter((f) => ['not_started', 'in_progress'].includes(f.status)).length,
      submitted: flats.filter((f) => f.status === 'submitted').length,
      revision: flats.filter((f) => f.status === 'revision_required').length,
      approved: flats.filter((f) => f.status === 'approved').length,
      handed_over: flats.filter((f) => f.status === 'handed_over').length,
    }),
    [flats]
  )

  const getTabCount = (tabId: string) => counts[tabId as keyof typeof counts] ?? 0

  const filteredFlats = useMemo(() => {
    let list = flats
    if (tab === 'pending') list = list.filter((f) => ['not_started', 'in_progress'].includes(f.status))
    if (tab === 'submitted') list = list.filter((f) => f.status === 'submitted')
    if (tab === 'revision') list = list.filter((f) => f.status === 'revision_required')
    if (tab === 'approved') list = list.filter((f) => f.status === 'approved')
    if (tab === 'handed_over') list = list.filter((f) => f.status === 'handed_over')
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (f) =>
          f.flatNumber.toLowerCase().includes(q) ||
          f.towerName?.toLowerCase().includes(q) ||
          f.floorLabel?.toLowerCase().includes(q)
      )
    }
    return list
  }, [flats, search, tab])

  useEffect(() => {
    if (location.pathname === ROUTES.ENGINEER_FLATS) {
      refresh()
    }
  }, [location.pathname, refresh])

  const tabItems = TABS.map((t) => ({
    value: t.id,
    label: t.label,
    count: getTabCount(t.id),
  }))

  const selectStat = (key: TabId) => {
    setTab((prev) => (prev === key ? 'all' : key))
  }

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">All Flats</h1>
          <p className="text-[11px] text-ink-400">
            {filteredFlats.length} shown · {flats.length} total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatCard
          index={0}
          label="Total"
          value={counts.all}
          icon={Home}
          selected={tab === 'all'}
          onClick={() => selectStat('all')}
        />
        <StatCard
          index={1}
          label="Pending"
          value={counts.pending}
          icon={Clock}
          colorClass="text-warning-600 bg-warning-100"
          selected={tab === 'pending'}
          onClick={() => selectStat('pending')}
        />
        <StatCard
          index={2}
          label="Submitted"
          value={counts.submitted}
          icon={Send}
          colorClass="text-brand-600 bg-brand-100"
          selected={tab === 'submitted'}
          onClick={() => selectStat('submitted')}
        />
        <StatCard
          index={3}
          label="Revision"
          value={counts.revision}
          icon={AlertTriangle}
          colorClass="text-warning-600 bg-warning-100"
          selected={tab === 'revision'}
          onClick={() => selectStat('revision')}
        />
        <StatCard
          index={4}
          label="Approved"
          value={counts.approved}
          icon={CheckCircle}
          colorClass="text-success-600 bg-success-100"
          selected={tab === 'approved'}
          onClick={() => selectStat('approved')}
        />
        <StatCard
          index={5}
          label="Handover"
          value={counts.handed_over}
          icon={PackageCheck}
          colorClass="text-accent-500 bg-accent-100"
          selected={tab === 'handed_over'}
          onClick={() => selectStat('handed_over')}
        />
      </div>

      {isAdmin && projects.length > 0 && (
        <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      )}

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
          placeholder="Search flat, tower, floor…"
          className="w-full min-h-[40px] rounded-md border border-ink-200 bg-surface py-2 pl-9 pr-3 text-sm text-ink-950 outline-none transition-all duration-fast focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          style={{ fontSize: '16px' }}
        />
      </div>

      <div className="overflow-x-auto pb-0.5">
        <Tabs tabs={tabItems} value={tab} onValueChange={(v) => setTab(v as TabId)} className="min-w-max" />
      </div>

      {loading && flats.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filteredFlats.length === 0 ? (
        <EmptyState
          title="No Flats Found"
          description={
            search ? 'Try a different search term.' : `No ${tab === 'all' ? '' : tab} flats found.`
          }
          className="py-10"
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${tab}-${search}-${projectFilter}`}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {filteredFlats.map((flat, i) => {
              const progress = progressOverrides[flat.id] ?? resolveFlatProgressPct(flat)
              return (
                <motion.div
                  key={flat.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={stagger(Math.min(i, 12))}
                >
                  <Link to={ROUTES.ENGINEER_FLAT(flat.id)} className="block touch-manipulation">
                    <Card
                      className={cn(
                        'overflow-hidden p-3 shadow-xs',
                        'transition-all duration-fast hover:border-brand-200 hover:shadow-sm active:scale-[0.99]'
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
                            {flat.towerName} · {flat.floorLabel}
                          </p>
                          {isAdmin && flat.inspection?.engineerName && (
                            <p className="truncate text-[11px] text-ink-400">
                              Eng: {flat.inspection.engineerName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                          <span>Progress</span>
                          <span className="tabular text-ink-600">{progress}%</span>
                        </div>
                        <ProgressBar pct={progress} />
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
