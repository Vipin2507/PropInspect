import { useState, useMemo, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Building2, Search } from 'lucide-react'
import { useFlats } from '../../hooks/useFlats'
import { useFlatProgressStore } from '../../store/flatProgressStore'
import { resolveFlatProgressPct } from '../../utils/completion'
import { useProjects } from '../../hooks/useProjects'
import { useAuthStore } from '../../store/authStore'
import { Badge } from '../../components/ui/Badge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Select } from '../../components/ui/Select'
import { ROUTES } from '../../constants/routes'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'

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

  // Admin can filter by project; engineer doesn't need this
  const { projects } = useProjects()
  const [projectFilter, setProjectFilter] = useState('')

  const { flats, loading, refresh } = useFlats(isAdmin && projectFilter ? projectFilter : undefined)
  const progressOverrides = useFlatProgressStore((s) => s.overrides)

  const [search, setSearch] = useState('')
  const [tab, setTab]       = useState('all')
  const location = useLocation()

  // Default admin to "all" tab; engineer to "pending"
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

  // Re-fetch when returning to this page so list matches latest auto-saves
  useEffect(() => {
    if (location.pathname === ROUTES.ENGINEER_FLATS) {
      refresh()
    }
  }, [location.pathname, refresh])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
          {isAdmin ? 'All Flats' : 'All Flats'}
        </h1>
        {isAdmin && (
          <span className="text-sm text-slate-500">{flats.length} total</span>
        )}
      </div>

      {/* Admin: project filter */}
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
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by flat, tower, floor…"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold touch-manipulation min-h-[44px]',
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 active:bg-slate-50'
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-slate-400">({getTabCount(t.id)})</span>
          </button>
        ))}
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
          {filteredFlats.map((flat) => {
            const progress =
              progressOverrides[flat.id] ?? resolveFlatProgressPct(flat)
            return (
              <Link
                key={flat.id}
                to={ROUTES.ENGINEER_FLAT(flat.id)}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98] active:shadow-md transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                      <Building2 size={22} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">{flat.flatNumber}</p>
                      <p className="truncate text-sm text-slate-500">
                        {flat.towerName} · {flat.floorLabel}
                      </p>
                      {isAdmin && flat.inspection?.engineerName && (
                        <p className="truncate text-xs text-slate-400">
                          Eng: {flat.inspection.engineerName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge status={flat.status} />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <ProgressBar pct={progress} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
