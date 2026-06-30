import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useQaChanges } from '../../hooks/useQaChanges'
import { ROUTES } from '../../constants/routes'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'
import { CheckCheck, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import type { TaskChangeLogEntry } from '../../types'

function formatChangeValue(change: TaskChangeLogEntry): string {
  if (change.changeType === 'status_change') {
    const label = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)
    return `${label(change.oldValue || 'pending')} → ${label(change.newValue)}`
  }
  return change.newValue
}

export default function ChangesLog() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [markingFlat, setMarkingFlat] = useState<string | null>(null)
  const { groups, totalUnreviewed, loading, markFlatReviewed, reload } = useQaChanges()

  const toggleExpand = (flatId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(flatId)) next.delete(flatId)
      else next.add(flatId)
      return next
    })
  }

  const handleMarkFlatReviewed = async (flatId: string, flatNumber: string) => {
    setMarkingFlat(flatId)
    try {
      const count = await markFlatReviewed(flatId)
      toast.success(`Marked ${count} change${count === 1 ? '' : 's'} reviewed for Flat ${flatNumber}`)
    } catch {
      toast.error('Could not mark as reviewed')
    } finally {
      setMarkingFlat(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Changes Log</h1>
          <p className="mt-1 text-sm text-slate-500">
            Engineer task updates — review as work progresses
          </p>
        </div>
        {totalUnreviewed > 0 && (
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
            {totalUnreviewed} unreviewed
          </span>
        )}
      </div>

      {loading && groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="No unreviewed changes"
          description="Engineer task updates will appear here as inspections are filled in."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = expanded.has(group.flatId)
            const inspectionId = group.changes[0]?.inspectionId
            const previewCount = Math.min(3, group.changes.length)

            return (
              <div
                key={group.flatId}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-800">
                        Flat {group.flatNumber}
                      </h2>
                      <Badge status={group.flatStatus} />
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {group.unreviewedCount} update{group.unreviewedCount === 1 ? '' : 's'}
                      </span>
                      <span className="text-xs text-slate-500">{group.completionPct}% complete</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {group.towerName} · {group.engineerName} ·{' '}
                      {group.lastChangeAt
                        ? formatDistanceToNow(new Date(group.lastChangeAt), { addSuffix: true })
                        : '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    {inspectionId && (
                      <Link
                        to={ROUTES.QA_REVIEW_DETAIL(inspectionId)}
                        className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 active:bg-slate-50"
                      >
                        <Eye size={14} aria-hidden="true" />
                        View flat
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={markingFlat === group.flatId}
                      onClick={() => handleMarkFlatReviewed(group.flatId, group.flatNumber)}
                      className="text-xs"
                    >
                      <CheckCheck size={14} className="mr-1" aria-hidden="true" />
                      Mark reviewed
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(group.flatId)}
                  className="flex w-full items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs font-medium text-slate-600 active:bg-slate-100"
                >
                  <span>
                    {isOpen ? 'Hide' : 'Show'} {group.changes.length} change
                    {group.changes.length === 1 ? '' : 's'}
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isOpen && (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {group.changes.map((change) => (
                      <li key={change.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{change.itemLabel}</p>
                            <p className="text-xs text-slate-500">{change.categoryName}</p>
                            <p
                              className={cn(
                                'mt-1 text-sm',
                                change.changeType === 'status_change' && change.newValue === 'fail'
                                  ? 'text-fail font-medium'
                                  : 'text-slate-700'
                              )}
                            >
                              {change.changeType === 'status_change' ? 'Status: ' : 'Remark: '}
                              {formatChangeValue(change)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-slate-400">
                            {formatDistanceToNow(new Date(change.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {!isOpen && group.changes.length > previewCount && (
                  <p className="px-4 pb-3 text-xs text-slate-400">
                    +{group.changes.length - previewCount} more…
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && groups.length > 0 && (
        <Button variant="secondary" className="mx-auto" onClick={() => reload()}>
          Refresh
        </Button>
      )}
    </div>
  )
}
