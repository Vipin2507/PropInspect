import { ClipboardCheck, CheckCircle, List, AlertCircle } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { useReviewQueue } from '../../hooks/useReviews'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { Spinner } from '../../components/ui/Spinner'

export default function QADashboard() {
  const { items, loading } = useReviewQueue()

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">QA Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending Review" value={items.length}  icon={ClipboardCheck} />
        <StatCard label="Approved Today" value={0}             icon={CheckCircle}    colorClass="text-pass bg-green-100" />
        <StatCard label="Total Reviewed" value={0}             icon={List} />
        <StatCard label="Overdue"        value={0}             icon={AlertCircle}    colorClass="text-fail bg-red-100" />
      </div>

      {/* Pending list */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Pending Reviews</h2>
          <Link to={ROUTES.QA_REVIEWS} className="text-sm font-medium text-primary active:underline">
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No pending reviews.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(items as { flatNumber: string; engineerName: string; submittedAt: string }[])
              .slice(0, 5)
              .map((item, i) => (
                <li key={i} className="flex min-h-[56px] items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{item.flatNumber}</p>
                    <p className="truncate text-xs text-slate-500">{item.engineerName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(item.submittedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}
