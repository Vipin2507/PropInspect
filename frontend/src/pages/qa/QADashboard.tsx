import { ClipboardCheck, CheckCircle, List, ScrollText, Bell } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useReviewQueue } from '../../hooks/useReviews'
import { useQaChangesCount } from '../../hooks/useQaChanges'
import { useNotificationStore } from '../../store/notificationStore'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { Spinner } from '../../components/ui/Spinner'

export default function QADashboard() {
  const { items, loading } = useReviewQueue()
  const { count: unreviewedChanges } = useQaChangesCount()
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  return (
    <div className="space-y-6 pb-6">
      <h1 className="font-display text-h2 text-ink-950">QA Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Submitted for Review" value={items.length} icon={ClipboardCheck} />
        <StatCard
          label="Unreviewed Changes"
          value={unreviewedChanges}
          icon={ScrollText}
          colorClass="text-warning-600 bg-warning-100"
        />
        <StatCard label="Approved Today" value={0} icon={CheckCircle} colorClass="text-success-600 bg-success-100" />
        <StatCard label="Total Reviewed" value={0} icon={List} />
      </div>

      {unreadCount > 0 && (
        <Link to={ROUTES.ENGINEER_NOTIFICATIONS} className="block">
          <Card className="overflow-hidden border-0 bg-gradient-to-r from-brand-600 to-brand-500 p-4 text-white shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                  <Bell size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {unreadCount} new activit{unreadCount === 1 ? 'y' : 'ies'}
                  </p>
                  <p className="text-xs text-white/80">Tap to open notifications</p>
                </div>
              </div>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-brand-600">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </div>
          </Card>
        </Link>
      )}

      <Card className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink-800">Submitted Reviews</h2>
          <Link to={ROUTES.QA_REVIEWS} className="text-sm font-medium text-brand-600 active:underline">
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No pending reviews"
            description="Submitted inspections will appear here."
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {(items as { flatNumber: string; engineerName: string; submittedAt: string }[])
              .slice(0, 5)
              .map((item, i) => (
                <li key={i} className="flex min-h-[56px] items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-800">{item.flatNumber}</p>
                    <p className="truncate text-xs text-ink-500">{item.engineerName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-400">
                    {new Date(item.submittedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      {unreviewedChanges > 0 && (
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-warning-600 to-warning-500 p-4 text-white shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {unreviewedChanges} engineer update{unreviewedChanges === 1 ? '' : 's'} to review
              </p>
              <p className="text-xs text-white/80">Check the Changes Log for in-progress work</p>
            </div>
            <Link
              to={ROUTES.QA_CHANGES}
              className="shrink-0 rounded-md bg-white px-4 py-2 text-sm font-semibold text-warning-600 active:brightness-95"
            >
              Open Log
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
