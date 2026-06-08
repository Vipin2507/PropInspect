import { useReviewHistory } from '../../hooks/useReviews'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'

export default function ReviewHistory() {
  const { history, loading } = useReviewHistory()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Review History</h1>

      {loading && history.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (history as any[]).length === 0 ? (
        <EmptyState title="No Reviews Yet" description="Completed reviews will appear here." />
      ) : (
        <div className="space-y-3">
          {(history as any[]).map((r, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-800">{r.flatNumber}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {new Date(r.reviewedAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <Badge status={r.decision} />
              </div>
              {r.overallComments && (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 leading-relaxed">
                  {r.overallComments}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
