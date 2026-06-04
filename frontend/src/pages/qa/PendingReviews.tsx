import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReviewQueue } from '../../hooks/useReviews';
import { ROUTES } from '../../constants/routes';
import { format, formatDistanceToNow } from 'date-fns';
import { FilterBar } from '../../components/ui/FilterBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Clock, User, Building } from 'lucide-react';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'overdue', label: 'Overdue' },
];

export default function PendingReviews() {
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
  });
  
  const { items, loading } = useReviewQueue(filters.status === 'all' ? undefined : filters.status);

  const handleFilterChange = (id: string, value: string) => {
    setFilters(prev => ({ ...prev, [id]: value }));
  };

  const filteredItems = useMemo(() => {
    if (!filters.search) return items;
    const searchTerm = filters.search.toLowerCase();
    return items.filter(
      (i: any) =>
        i.flatNumber.toLowerCase().includes(searchTerm) ||
        i.towerName.toLowerCase().includes(searchTerm) ||
        i.engineerName.toLowerCase().includes(searchTerm)
    );
  }, [items, filters.search]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Pending Reviews</h1>
      
      <FilterBar
        filters={[
          { id: 'status', label: 'Filter by', value: filters.status, options: FILTER_OPTIONS },
        ]}
        search={{ value: filters.search, placeholder: 'Search Flat, Tower, Engineer...' }}
        onFilterChange={handleFilterChange}
        onSearchChange={(value) => handleFilterChange('search', value)}
        className="mb-6"
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No Pending Reviews"
          message="There are no inspections awaiting your review right now."
        />
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item: any) => (
            <Link
              key={item.inspectionId}
              to={ROUTES.QA_REVIEW_DETAIL(item.inspectionId)}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-bold text-lg text-slate-800">{item.flatNumber}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}
                </p>
              </div>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Building size={14} /> {item.towerName}</p>
                <p className="flex items-center gap-2"><User size={14} /> Submitted by {item.engineerName}</p>
                <p className="flex items-center gap-2"><Clock size={14} /> {format(new Date(item.submittedAt), 'PPp')}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
