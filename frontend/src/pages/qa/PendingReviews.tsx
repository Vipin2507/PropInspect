import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useReviewQueue } from '../../hooks/useReviews'
import { ROUTES } from '../../constants/routes'
import { format, formatDistanceToNow } from 'date-fns'
import { FilterBar } from '../../components/ui/FilterBar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { Clock, User, Building } from 'lucide-react'

const FILTER_OPTIONS = [
  { value: 'all',     label: 'All' },
  { value: 'today',   label: 'Today' },
  { value: 'overdue', label: 'Overdue' },
]

export default function PendingReviews() {
  const [filters, setFilters] = useState({ status: 'all', search: '' })
  const { items, loading } = useReviewQueue(filters.status === 'all' ? undefined : filters.status)

  const filteredItems = useMemo(() => {
    if (!filters.search) return items
    const q = filters.search.toLowerCase()
    return (items as any[]).filter(
      (i) =>
        i.flatNumber.toLowerCase().includes(q) ||
        i.towerName.toLowerCase().includes(q) ||
        i.engineerName.toLowerCase().includes(q)
    )
  }, [items, filters.search])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Pending Reviews</h1>

      <FilterBar
        filters={[{ id: 'status', label: 'Filter', value: filters.status, options: FILTER_OPTIONS }]}
        search={{ value: filters.search, placeholder: 'Search flat, tower, engineer…' }}
        onFilterChange={(id, value) => setFilters((p) => ({ ...p, [id]: value }))}
        onSearchChange={(value) => setFilters((p) => ({ ...p, search: value }))}
      />

      {loading && (items as any[]).length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState title="No Pending Reviews" description="All inspections have been reviewed." />
      ) : (
        <div className="space-y-3">
          {(filteredItems as any[]).map((item) => (
            <Link
              key={item.inspectionId}
              to={ROUTES.QA_REVIEW_DETAIL(item.inspectionId)}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98] active:shadow-md transition-transform"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-bold text-slate-800">{item.flatNumber}</h2>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}
                </span>
              </div>
              <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Building size={14} aria-hidden="true" />
                  {item.towerName}
                </p>
                <p className="flex items-center gap-2">
                  <User size={14} aria-hidden="true" />
                  {item.engineerName}
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={14} aria-hidden="true" />
                  {format(new Date(item.submittedAt), 'PPp')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
