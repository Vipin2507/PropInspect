import { ClipboardCheck, CheckCircle, List, ScrollText } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { useReviewQueue } from '../../hooks/useReviews'
import { useQaChangesCount } from '../../hooks/useQaChanges'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { Spinner } from '../../components/ui/Spinner'

export default function QADashboard() {
  const { items, loading } = useReviewQueue()
  const { count: unreviewedChanges } = useQaChangesCount()

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">QA Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Submitted for Review" value={items.length} icon={ClipboardCheck} />
        <StatCard
          label="Unreviewed Changes"
          value={unreviewedChanges}
          icon={ScrollText}
          colorClass="text-amber-700 bg-amber-100"
        />
        <StatCard label="Approved Today" value={0} icon={CheckCircle} colorClass="text-pass bg-green-100" />
        <StatCard label="Total Reviewed" value={0} icon={List} />
      </div>

      {/* Pending list */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Submitted Reviews</h2>
          <Link to={ROUTES.QA_REVIEWS} className="text-sm font-medium text-primary active:underline">
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No pending submitted reviews.</p>
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

      {unreviewedChanges > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {unreviewedChanges} engineer update{unreviewedChanges === 1 ? '' : 's'} to review
              </p>
              <p className="text-xs text-amber-700">Check the Changes Log for in-progress work</p>
            </div>
            <Link
              to={ROUTES.QA_CHANGES}
              className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white active:bg-amber-700"
            >
              Open Log
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
