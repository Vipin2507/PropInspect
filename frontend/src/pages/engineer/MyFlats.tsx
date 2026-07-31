import { useState, useMemo, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Search } from 'lucide-react'
import { useFlats } from '../../hooks/useFlats'
import { useFlatProgressStore } from '../../store/flatProgressStore'
import { resolveFlatProgressPct } from '../../utils/completion'
import { useProjects } from '../../hooks/useProjects'
import { useAuthStore } from '../../store/authStore'
import { StatusBadge } from '../../components/ui/Badge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Select } from '../../components/ui/Select'
import { Card } from '../../components/ui/Card'
import { Tabs } from '../../components/ui/Tabs'
import { ROUTES } from '../../constants/routes'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { useMotionSafe } from '../../hooks/useMotionSafe'

const TABS = [
  { id: 'all',        label: 'All' },
  { id: 'pending',    label: 'Pending' },
  { id: 'submitted',  label: 'Submitted' },
  { id: 'revision',   label: 'Revision' },
  { id: 'approved',   label: 'Approved' },
  { id: 'handed_over', label: 'Handed Over' },
]

export default function MyFlats() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const { stagger } = useMotionSafe()

  const { projects } = useProjects()
  const [projectFilter, setProjectFilter] = useState('')

  const { flats, loading, refresh } = useFlats(isAdmin && projectFilter ? projectFilter : undefined)
  const progressOverrides = useFlatProgressStore((s) => s.overrides)

  const [search, setSearch] = useState('')
  const [tab, setTab]       = useState('all')
  const location = useLocation()

  useEffect(() => {
    setTab(isAdmin ? 'all' : 'pending')
  }, [isAdmin])

  const getTabCount = (tabId: string) => {
    if (tabId === 'all')         return flats.length
    if (tabId === 'pending')     return flats.filter((f) => ['not_started', 'in_progress'].includes(f.status)).length
    if (tabId === 'submitted')   return flats.filter((f) => f.status === 'submitted').length
    if (tabId === 'revision')    return flats.filter((f) => f.status === 'revision_required').length
    if (tabId === 'approved')    return flats.filter((f) => f.status === 'approved').length
    if (tabId === 'handed_over') return flats.filter((f) => f.status === 'handed_over').length
    return 0
  }

  const filteredFlats = useMemo(() => {
    let list = flats
    if (tab === 'pending')     list = list.filter((f) => ['not_started', 'in_progress'].includes(f.status))
    if (tab === 'submitted')   list = list.filter((f) => f.status === 'submitted')
    if (tab === 'revision')    list = list.filter((f) => f.status === 'revision_required')
    if (tab === 'approved')    list = list.filter((f) => f.status === 'approved')
    if (tab === 'handed_over') list = list.filter((f) => f.status === 'handed_over')
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((f) =>
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-ink-950">All Flats</h1>
        {isAdmin && (
          <span className="text-body text-ink-500">{flats.length} total</span>
        )}
      </div>

      {isAdmin && projects.length > 0 && (
        <Select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by flat, tower, floor…"
          className="w-full rounded-md border border-ink-200 bg-surface py-3 pl-11 pr-4 text-base text-ink-950 outline-none transition-all duration-fast focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-1">
        <Tabs
          tabs={tabItems}
          value={tab}
          onValueChange={setTab}
          className="min-w-max"
        />
      </div>

      {/* Content */}
      {loading && flats.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredFlats.length === 0 ? (
        <EmptyState
          title="No Flats Found"
          description={search ? 'Try a different search term.' : `No ${tab === 'all' ? '' : tab} flats found.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFlats.map((flat, i) => {
            const progress =
              progressOverrides[flat.id] ?? resolveFlatProgressPct(flat)
            return (
              <motion.div
                key={flat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(i)}
              >
                <Link to={ROUTES.ENGINEER_FLAT(flat.id)} className="block">
                  <Card interactive className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                          <Building2 size={22} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-800">{flat.flatNumber}</p>
                          <p className="truncate text-sm text-ink-500">
                            {flat.towerName} · {flat.floorLabel}
                          </p>
                          {isAdmin && flat.inspection?.engineerName && (
                            <p className="truncate text-xs text-ink-400">
                              Eng: {flat.inspection.engineerName}
                            </p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={flat.status} />
                    </div>
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-ink-500">
                        <span>Progress</span>
                        <span className="font-semibold tabular">{progress}%</span>
                      </div>
                      <ProgressBar pct={progress} />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
