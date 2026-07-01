import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useEngineerFeedback } from '../../hooks/useEngineerFeedback'
import { ROUTES } from '../../constants/routes'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'
import { CheckCheck, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import type { EngineerFeedbackEntry } from '../../types'

const FEEDBACK_LABEL: Record<string, string> = {
  revision_required: 'Sent for revision',
  rejected: 'Rejected by QA',
  approved: 'Approved by QA',
}

function feedbackTone(type: string): string {
  if (type === 'revision_required') return 'text-amber-700'
  if (type === 'rejected') return 'text-fail'
  return 'text-pass'
}

export default function EngineerChangesLog() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [markingFlat, setMarkingFlat] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { groups, totalUnseen, loading, error, markFlatSeen, reload } = useEngineerFeedback({
    unseenOnly: !showAll,
  })

  const toggleExpand = (flatId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(flatId)) next.delete(flatId)
      else next.add(flatId)
      return next
    })
  }

  const handleMarkFlatSeen = async (flatId: string, flatNumber: string) => {
    setMarkingFlat(flatId)
    try {
      const count = await markFlatSeen(flatId)
      toast.success(`Marked ${count} item${count === 1 ? '' : 's'} seen for Flat ${flatNumber}`)
    } catch {
      toast.error('Could not mark as seen')
    } finally {
      setMarkingFlat(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">QA Feedback Log</h1>
          <p className="mt-1 text-sm text-slate-500">
            QA revisions on your flats — open a flat, expand a task, tap Revision with a remark
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {totalUnseen > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {totalUnseen} new
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium text-primary active:underline"
          >
            {showAll ? 'New only' : 'Show all'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} — is the backend updated?
        </div>
      )}

      {loading && groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title={showAll ? 'No QA feedback yet' : 'No new QA feedback'}
          description="When QA taps Revision or Reject on a task (with a remark), it appears here. Engineer fail remarks go to QA Changes Log, not this page."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = expanded.has(group.flatId)

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
                        {group.unseenCount} new
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {group.towerName} · QA: {group.qaName} ·{' '}
                      {group.lastFeedbackAt
                        ? formatDistanceToNow(new Date(group.lastFeedbackAt), { addSuffix: true })
                        : '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Link
                      to={ROUTES.ENGINEER_FLAT(group.flatId)}
                      className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 active:bg-slate-50"
                    >
                      <Eye size={14} aria-hidden="true" />
                      Open flat
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={markingFlat === group.flatId}
                      onClick={() => handleMarkFlatSeen(group.flatId, group.flatNumber)}
                      className="text-xs"
                    >
                      <CheckCheck size={14} className="mr-1" aria-hidden="true" />
                      Mark seen
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(group.flatId)}
                  className="flex w-full items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs font-medium text-slate-600 active:bg-slate-100"
                >
                  <span>
                    {isOpen ? 'Hide' : 'Show'} {group.feedback.length} feedback item
                    {group.feedback.length === 1 ? '' : 's'}
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isOpen && (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {group.feedback.map((item: EngineerFeedbackEntry) => (
                      <li key={item.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{item.itemLabel}</p>
                            <p className="text-xs text-slate-500">{item.categoryName}</p>
                            <p className={cn('mt-1 text-sm font-semibold', feedbackTone(item.feedbackType))}>
                              {FEEDBACK_LABEL[item.feedbackType] ?? item.feedbackType}
                            </p>
                            {item.remark && (
                              <p className="mt-1 text-sm text-slate-600">{item.remark}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-slate-400">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
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
