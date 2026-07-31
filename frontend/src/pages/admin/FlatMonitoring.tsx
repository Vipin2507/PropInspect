import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlats } from '../../hooks/useFlats'
import { useProjects } from '../../hooks/useProjects'
import { useTowers } from '../../hooks/useTowers'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
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
      <h1 className="font-display text-h2 text-ink-950">Flat Monitoring</h1>

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
        <p className="text-body text-ink-500">
          Showing{' '}
          <span className="font-semibold text-ink-700">{displayed.length}</span>
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
          <Card className="hidden overflow-hidden sm:block">
            <div className="grid grid-cols-[1fr_140px_110px_1fr] gap-3 border-b border-ink-100 bg-ink-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
              <span>Flat</span>
              <span>Status</span>
              <span>Open Snags</span>
              <span>Engineer</span>
            </div>
            <ul className="divide-y divide-ink-100">
              {displayed.map((flat) => {
                const openSnags = openSnagsByFlat[flat.id] || 0
                return (
                  <li key={flat.id}>
                    <button
                      type="button"
                      onClick={() => handleRowTap(flat)}
                      className="grid w-full grid-cols-[1fr_140px_110px_1fr] items-center gap-3 px-4 py-3 text-left touch-manipulation transition-colors active:bg-ink-50"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-800">{flat.flatNumber}</p>
                        <p className="truncate text-xs text-ink-500">
                          {flat.towerName} · {flat.floorLabel}
                        </p>
                      </div>
                      <StatusBadge status={flat.status} />
                      <span className={`text-sm font-semibold tabular ${openSnags > 0 ? 'text-danger-600' : 'text-ink-400'}`}>
                        {openSnags > 0 ? openSnags : '—'}
                      </span>
                      <span className="truncate text-sm text-ink-600">
                        {flat.inspection?.engineerName || flat.engineerName || '—'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {filtered.length > 20 && (
              <div className="border-t border-ink-100 px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-sm font-medium text-brand-600 active:underline touch-manipulation"
                >
                  {showAll ? 'Show less' : `View all ${filtered.length} flats →`}
                </button>
              </div>
            )}
          </Card>

          {/* ── Mobile cards (< sm) ── */}
          <div className="space-y-2 sm:hidden">
            {displayed.map((flat) => {
              const openSnags = openSnagsByFlat[flat.id] || 0
              return (
                <Card
                  key={flat.id}
                  interactive
                  className="flex w-full items-center gap-3 p-4 min-h-[72px]"
                  onClick={() => handleRowTap(flat)}
                >
                  <div className="min-w-0 flex-1">
                    {/* Top row: flat number + status */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-ink-800">{flat.flatNumber}</p>
                      <StatusBadge status={flat.status} />
                    </div>

                    {/* Tower + floor */}
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {flat.towerName} · {flat.floorLabel}
                    </p>

                    {/* Engineer + snags row */}
                    <div className="mt-1.5 flex items-center gap-3 text-xs">
                      {flat.inspection?.engineerName || flat.engineerName ? (
                        <span className="flex items-center gap-1 text-ink-500">
                          <User size={11} aria-hidden="true" />
                          {flat.inspection?.engineerName || flat.engineerName}
                        </span>
                      ) : null}
                      {openSnags > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-danger-600">
                          <AlertTriangle size={11} aria-hidden="true" />
                          {openSnags} snag{openSnags !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} className="shrink-0 text-ink-300" aria-hidden="true" />
                </Card>
              )
            })}

            {filtered.length > 20 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="w-full rounded-lg border border-ink-100 bg-surface py-3 text-center text-sm font-medium text-brand-600 touch-manipulation active:bg-ink-50"
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
