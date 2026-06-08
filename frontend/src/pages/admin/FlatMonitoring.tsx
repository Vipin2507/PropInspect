import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlats } from '../../hooks/useFlats'
import { useProjects } from '../../hooks/useProjects'
import { useTowers } from '../../hooks/useTowers'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ROUTES } from '../../constants/routes'
import { useSnags } from '../../hooks/useSnags'
import { AlertTriangle, ChevronRight, User } from 'lucide-react'
import type { Flat } from '../../types'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'revision_required', label: 'Revision Req.' },
  { value: 'rejected', label: 'Rejected' },
]

export default function FlatMonitoring() {
  const navigate = useNavigate()
  const { projects } = useProjects()
  const [projectFilter, setProjectFilter] = useState('')
  const [towerFilter, setTowerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAll, setShowAll] = useState(false)

  const { towers } = useTowers(projectFilter || null)
  const { flats, loading } = useFlats(projectFilter || undefined)
  const { snags } = useSnags({ projectId: projectFilter || undefined })

  // Reset tower filter when project changes
  useEffect(() => { setTowerFilter('') }, [projectFilter])

  const openSnagsByFlat = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of snags) {
      if (['open', 'assigned', 'in_rectification'].includes(s.status)) {
        map[s.flatId] = (map[s.flatId] || 0) + 1
      }
    }
    return map
  }, [snags])

  const filtered = useMemo(() => {
    let list = flats
    if (towerFilter) list = list.filter((f) => f.towerId === towerFilter)
    if (statusFilter) list = list.filter((f) => f.status === statusFilter)
    return list
  }, [flats, towerFilter, statusFilter])

  const displayed = showAll ? filtered : filtered.slice(0, 20)

  const handleRowTap = (flat: Flat) => {
    navigate(ROUTES.ENGINEER_FLAT(flat.id))
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Flat Monitoring</h1>

      {/* Filters — stacked on mobile, row on sm+ */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          aria-label="Filter by project"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>

        <Select
          value={towerFilter}
          onChange={(e) => setTowerFilter(e.target.value)}
          aria-label="Filter by tower"
          disabled={!projectFilter}
        >
          <option value="">All Towers</option>
          {towers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      {/* Count */}
      {!loading && filtered.length > 0 && (
        <p className="text-sm text-slate-500">
          Showing{' '}
          <span className="font-semibold text-slate-700">{displayed.length}</span>
          {filtered.length !== displayed.length && ` of ${filtered.length}`}{' '}
          flat{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Content */}
      {loading && flats.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No Flats Found" description="Try adjusting your filters." />
      ) : (
        <>
          {/* ── Desktop table (sm+) ── */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:block">
            <div className="grid grid-cols-[1fr_140px_110px_1fr] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Flat</span>
              <span>Status</span>
              <span>Open Snags</span>
              <span>Engineer</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {displayed.map((flat) => {
                const openSnags = openSnagsByFlat[flat.id] || 0
                return (
                  <li key={flat.id}>
                    <button
                      type="button"
                      onClick={() => handleRowTap(flat)}
                      className="grid w-full grid-cols-[1fr_140px_110px_1fr] items-center gap-3 px-4 py-3 text-left touch-manipulation active:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{flat.flatNumber}</p>
                        <p className="truncate text-xs text-slate-500">
                          {flat.towerName} · {flat.floorLabel}
                        </p>
                      </div>
                      <Badge status={flat.status} />
                      <span className={`text-sm font-semibold ${openSnags > 0 ? 'text-fail' : 'text-slate-400'}`}>
                        {openSnags > 0 ? openSnags : '—'}
                      </span>
                      <span className="truncate text-sm text-slate-600">
                        {flat.assignment?.engineerName || '—'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {filtered.length > 20 && (
              <div className="border-t border-slate-100 px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-sm font-medium text-primary active:underline touch-manipulation"
                >
                  {showAll ? 'Show less' : `View all ${filtered.length} flats →`}
                </button>
              </div>
            )}
          </div>

          {/* ── Mobile cards (< sm) ── */}
          <div className="space-y-2 sm:hidden">
            {displayed.map((flat) => {
              const openSnags = openSnagsByFlat[flat.id] || 0
              return (
                <button
                  key={flat.id}
                  type="button"
                  onClick={() => handleRowTap(flat)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm touch-manipulation active:bg-slate-50 active:scale-[0.99] transition-transform min-h-[72px]"
                >
                  <div className="min-w-0 flex-1">
                    {/* Top row: flat number + status */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-800">{flat.flatNumber}</p>
                      <Badge status={flat.status} />
                    </div>

                    {/* Tower + floor */}
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {flat.towerName} · {flat.floorLabel}
                    </p>

                    {/* Engineer + snags row */}
                    <div className="mt-1.5 flex items-center gap-3 text-xs">
                      {flat.assignment?.engineerName && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <User size={11} aria-hidden="true" />
                          {flat.assignment.engineerName}
                        </span>
                      )}
                      {openSnags > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-fail">
                          <AlertTriangle size={11} aria-hidden="true" />
                          {openSnags} snag{openSnags !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} className="shrink-0 text-slate-300" aria-hidden="true" />
                </button>
              )
            })}

            {filtered.length > 20 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-medium text-primary touch-manipulation active:bg-slate-50"
              >
                {showAll ? 'Show less' : `View all ${filtered.length} flats →`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
