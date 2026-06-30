import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCheckerFlats } from '../../hooks/useCheckerFlats'
import { ROUTES } from '../../constants/routes'
import { FilterBar } from '../../components/ui/FilterBar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { User, Building } from 'lucide-react'
import { cn } from '../../utils/cn'

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
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">All Flats</h1>
        <p className="mt-1 text-sm text-slate-500">
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
        <div className="space-y-3">
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
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98] active:shadow-md transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-800">{flat.flatNumber}</h2>
                      <Badge status={flat.status} />
                      {unreviewed > 0 && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          {unreviewed} new
                        </span>
                      )}
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                          pct === 100
                            ? 'bg-green-100 text-green-700'
                            : pct >= 75
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {pct}% complete
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {flat.towerName && (
                        <span className="inline-flex items-center gap-1">
                          <Building size={12} aria-hidden="true" />
                          {flat.towerName}
                        </span>
                      )}
                      {engineerName && (
                        <span className="inline-flex items-center gap-1">
                          <User size={12} aria-hidden="true" />
                          {engineerName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
