import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCheckerFlats } from '../../hooks/useCheckerFlats'
import { ROUTES } from '../../constants/routes'
import { formatDistanceToNow, format } from 'date-fns'
import { FilterBar } from '../../components/ui/FilterBar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Clock, User, Building } from 'lucide-react'
import { cn } from '../../utils/cn'

const STATUS_FILTER_OPTIONS = [
  { value: 'all',                label: 'All' },
  { value: 'submitted',         label: 'Pending Review' },
  { value: 'revision_required', label: 'Revision' },
  { value: 'approved',          label: 'Approved' },
  { value: 'rejected',          label: 'Rejected' },
]

export default function PendingReviews() {
  const [filters, setFilters] = useState({ status: 'all', search: '' })

  const { flats, loading } = useCheckerFlats({ search: filters.search })

  const filteredFlats = useMemo(() => {
    if (filters.status === 'all') return flats
    return flats.filter((f) => f.status === filters.status)
  }, [flats, filters.status])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Flat Reviews</h1>

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
          title="No flats to review"
          description="Flats will appear here once engineers submit them for review."
        />
      ) : (
        <div className="space-y-3">
          {filteredFlats.map((flat) => {
            const inspectionId = (flat as any).inspectionId || flat.inspection?.id
            const submittedAt  = (flat as any).submittedAt || flat.inspection?.submittedAt
            const engineerName = (flat as any).engineerName || flat.inspection?.engineerName
            const pct = flat.completionPct ?? 0

            return (
              <Link
                key={flat.id}
                to={inspectionId ? ROUTES.QA_REVIEW_DETAIL(inspectionId) : '#'}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98] active:shadow-md transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-800">{flat.flatNumber}</h2>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <Badge status={flat.status} />
                      {/* Req 5.2 — completionPct badge */}
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        pct === 100
                          ? 'bg-green-100 text-green-700'
                          : pct >= 75
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      )}>
                        {pct}% complete
                      </span>
                    </div>
                  </div>
                  {submittedAt && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDistanceToNow(new Date(submittedAt), { addSuffix: true })}
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  {flat.towerName && (
                    <p className="flex items-center gap-2">
                      <Building size={14} aria-hidden="true" />
                      {flat.towerName}
                      {flat.floorLabel && ` · ${flat.floorLabel}`}
                    </p>
                  )}
                  {engineerName && (
                    <p className="flex items-center gap-2">
                      <User size={14} aria-hidden="true" />
                      {engineerName}
                    </p>
                  )}
                  {submittedAt && (
                    <p className="flex items-center gap-2">
                      <Clock size={14} aria-hidden="true" />
                      {format(new Date(submittedAt), 'PPp')}
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        pct === 100 ? 'bg-green-500' : 'bg-primary'
                      )}
                      style={{ width: `${pct}%` }}
                    />
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
