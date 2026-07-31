import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCheckerFlats } from '../../hooks/useCheckerFlats'
import { ROUTES } from '../../constants/routes'
import { formatDistanceToNow, format } from 'date-fns'
import { FilterBar } from '../../components/ui/FilterBar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Clock, User, Building } from 'lucide-react'

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
    const submittedStatuses = ['submitted', 'revision_required', 'approved', 'rejected']
    const base = flats.filter((f) => submittedStatuses.includes(f.status))
    if (filters.status === 'all') return base
    return base.filter((f) => f.status === filters.status)
  }, [flats, filters.status])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-h2 text-ink-950">Submitted Reviews</h1>

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
                className="block"
              >
                <Card interactive className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-ink-800">{flat.flatNumber}</h2>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <StatusBadge status={flat.status} />
                        <span className="text-xs font-semibold tabular text-ink-500">
                          {pct}% complete
                        </span>
                      </div>
                    </div>
                    {submittedAt && (
                      <span className="shrink-0 text-xs text-ink-400">
                        {formatDistanceToNow(new Date(submittedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-ink-600">
                    {flat.towerName && (
                      <p className="flex items-center gap-2">
                        <Building size={14} className="text-ink-400" aria-hidden="true" />
                        {flat.towerName}
                        {flat.floorLabel && ` · ${flat.floorLabel}`}
                      </p>
                    )}
                    {engineerName && (
                      <p className="flex items-center gap-2">
                        <User size={14} className="text-ink-400" aria-hidden="true" />
                        {engineerName}
                      </p>
                    )}
                    {submittedAt && (
                      <p className="flex items-center gap-2">
                        <Clock size={14} className="text-ink-400" aria-hidden="true" />
                        {format(new Date(submittedAt), 'PPp')}
                      </p>
                    )}
                  </div>

                  <div className="mt-3">
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
