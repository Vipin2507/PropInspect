import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useEngineerFeedback } from '../../hooks/useEngineerFeedback'
import { ROUTES } from '../../constants/routes'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { cn } from '../../utils/cn'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import toast from 'react-hot-toast'
import { CheckCheck, ChevronDown, Eye } from 'lucide-react'
import type { EngineerFeedbackEntry } from '../../types'

const FEEDBACK_LABEL: Record<string, string> = {
  revision_required: 'Sent for revision',
  rejected: 'Rejected by QA',
  approved: 'Approved by QA',
}

function feedbackTone(type: string): string {
  if (type === 'revision_required') return 'text-warning-600'
  if (type === 'rejected') return 'text-danger-600'
  return 'text-success-600'
}

export default function EngineerChangesLog() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [markingFlat, setMarkingFlat] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { reduced } = useMotionSafe()
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
          <h1 className="font-display text-h2 text-ink-950">QA Feedback Log</h1>
          <p className="mt-1 text-body text-ink-500">
            QA revisions on your flats — open a flat, expand a task, tap Revision with a remark
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {totalUnseen > 0 && (
            <span className="rounded-full bg-warning-100 px-3 py-1 text-sm font-semibold text-warning-600">
              {totalUnseen} new
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium text-brand-600 active:underline"
          >
            {showAll ? 'New only' : 'Show all'}
          </button>
        </div>
      </div>

      {error && (
        <Card className="border-danger-600/20 bg-danger-100/40 px-4 py-3 text-sm text-danger-600">
          {error} — is the backend updated?
        </Card>
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
              <Card
                key={group.flatId}
                className="relative overflow-hidden border-l-[3px] border-l-warning-500"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-ink-800">
                        Flat {group.flatNumber}
                      </h2>
                      <StatusBadge status={group.flatStatus} />
                      <span className="rounded-full bg-warning-100 px-2.5 py-0.5 text-label font-semibold text-warning-600">
                        {group.unseenCount} new
                      </span>
                    </div>
                    <p className="mt-1 text-caption text-ink-500">
                      {group.towerName} · QA: {group.qaName} ·{' '}
                      {group.lastFeedbackAt
                        ? formatDistanceToNow(new Date(group.lastFeedbackAt), { addSuffix: true })
                        : '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Link
                      to={ROUTES.ENGINEER_FLAT(group.flatId)}
                      className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-md border border-ink-200 px-3 text-xs font-medium text-ink-700 active:bg-ink-50"
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
                  className="flex w-full items-center justify-between border-t border-ink-100 bg-ink-50/80 px-4 py-2.5 text-xs font-medium text-ink-600 active:bg-ink-100"
                >
                  <span>
                    {isOpen ? 'Hide' : 'Show'} {group.feedback.length} feedback item
                    {group.feedback.length === 1 ? '' : 's'}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.2 }}
                  >
                    <ChevronDown size={16} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.ul
                      initial={reduced ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduced ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="divide-y divide-ink-100 overflow-hidden border-t border-ink-100"
                    >
                      {group.feedback.map((item: EngineerFeedbackEntry) => (
                        <li key={item.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink-800">{item.itemLabel}</p>
                              <p className="text-caption text-ink-500">{item.categoryName}</p>
                              <p className={cn('mt-1 text-sm font-semibold', feedbackTone(item.feedbackType))}>
                                {FEEDBACK_LABEL[item.feedbackType] ?? item.feedbackType}
                              </p>
                              {item.remark && (
                                <p className="mt-1 rounded-md bg-ink-50 p-2 text-sm text-ink-600">{item.remark}</p>
                              )}
                            </div>
                            <span className="shrink-0 text-caption text-ink-400">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </Card>
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
