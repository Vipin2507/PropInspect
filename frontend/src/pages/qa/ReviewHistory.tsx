import { useReviewHistory } from '../../hooks/useReviews'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'

export default function ReviewHistory() {
  const { history, loading } = useReviewHistory()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-h2 text-ink-950">Review History</h1>

      {loading && history.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (history as any[]).length === 0 ? (
        <EmptyState title="No Reviews Yet" description="Completed reviews will appear here." />
      ) : (
        <div className="space-y-3">
          {(history as any[]).map((r, i) => (
            <Card
              key={i}
              className="relative overflow-hidden border-l-[3px] border-l-brand-500 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink-800">{r.flatNumber}</p>
                  <p className="mt-0.5 text-body text-ink-500">
                    {new Date(r.reviewedAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <StatusBadge status={r.decision} />
              </div>
              {r.overallComments && (
                <div className="mt-3 rounded-md bg-ink-50 p-3">
                  <p className="text-sm leading-relaxed text-ink-600">{r.overallComments}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
