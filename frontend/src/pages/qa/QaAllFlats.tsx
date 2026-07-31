import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCheckerFlats } from '../../hooks/useCheckerFlats'
import { ROUTES } from '../../constants/routes'
import { FilterBar } from '../../components/ui/FilterBar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { User, Building, Building2 } from 'lucide-react'

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'revision_required', label: 'Revision' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function QaAllFlats() {
  const [filters, setFilters] = useState({ status: 'all', search: '' })
  const { flats, loading } = useCheckerFlats({ search: filters.search })

  const filteredFlats = useMemo(() => {
    if (filters.status === 'all') return flats
    return flats.filter((f) => f.status === filters.status)
  }, [flats, filters.status])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-h2 text-ink-950">All Flats</h1>
        <p className="mt-1 text-body text-ink-500">
          In-progress and submitted flats — open to view engineer work
        </p>
      </div>

      <FilterBar
        filters={[{ id: 'status', label: 'Status', value: filters.status, options: STATUS_FILTER_OPTIONS }]}
        search={{ value: filters.search, placeholder: 'Search flat, tower, engineer…' }}
        onFilterChange={(id, value) => setFilters((p) => ({ ...p, [id]: value }))}
        onSearchChange={(value) => setFilters((p) => ({ ...p, search: value }))}
      />

      {loading && filteredFlats.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredFlats.length === 0 ? (
        <EmptyState
          title="No flats found"
          description="Flats appear here once engineers start inspections."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFlats.map((flat) => {
            const inspectionId = flat.inspectionId || flat.inspection?.id
            const engineerName = flat.engineerName || flat.inspection?.engineerName
            const pct = flat.completionPct ?? 0
            const unreviewed = flat.unreviewedChangeCount ?? 0

            return (
              <Link
                key={flat.id}
                to={
                  inspectionId
                    ? ROUTES.QA_REVIEW_DETAIL(inspectionId)
                    : ROUTES.QA_CHANGES
                }
                className="block"
              >
                <Card interactive className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                        <Building2 size={22} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-800">{flat.flatNumber}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          {flat.towerName && (
                            <span className="inline-flex items-center gap-1 truncate text-xs text-ink-500">
                              <Building size={12} aria-hidden="true" />
                              {flat.towerName}
                            </span>
                          )}
                          {engineerName && (
                            <span className="inline-flex items-center gap-1 truncate text-xs text-ink-500">
                              <User size={12} aria-hidden="true" />
                              {engineerName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusBadge status={flat.status} />
                      {unreviewed > 0 && (
                        <span className="inline-flex items-center rounded-full bg-warning-100 px-2 py-0.5 text-[11px] font-semibold text-warning-600">
                          {unreviewed} new
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-ink-500">
                      <span>Progress</span>
                      <span className="font-semibold tabular">{pct}%</span>
                    </div>
                    <ProgressBar pct={pct} />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
