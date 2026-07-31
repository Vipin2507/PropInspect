import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useEngineerFeedback } from '../../hooks/useEngineerFeedback'
import { ROUTES } from '../../constants/routes'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { Button } from '../../components/ui/Button'
import { cn } from '../../utils/cn'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import toast from 'react-hot-toast'
import {
  CheckCheck, ChevronDown, Eye, RefreshCw, AlertTriangle,
  XCircle, CheckCircle2, Building2, ScrollText,
} from 'lucide-react'
import type { EngineerFeedbackEntry } from '../../types'

const FEEDBACK_LABEL: Record<string, string> = {
  revision_required: 'Sent for revision',
  rejected: 'Rejected by QA',
  approved: 'Approved by QA',
}

const compactBtn = '!min-h-[32px] !px-2 !py-1 text-[11px]'
const easeOut = [0.22, 1, 0.36, 1] as const

function feedbackMeta(type: string) {
  if (type === 'revision_required')
    return { tone: 'text-warning-600', Icon: AlertTriangle, chip: 'bg-warning-100 text-warning-600' }
  if (type === 'rejected')
    return { tone: 'text-danger-600', Icon: XCircle, chip: 'bg-danger-100 text-danger-600' }
  return { tone: 'text-success-600', Icon: CheckCircle2, chip: 'bg-success-100 text-success-600' }
}

export default function EngineerChangesLog() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [markingFlat, setMarkingFlat] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const { groups, totalUnseen, loading, error, markFlatSeen, reload } = useEngineerFeedback({
    unseenOnly: !showAll,
  })

  const stats = useMemo(() => {
    let revisions = 0
    let rejected = 0
    let approved = 0
    for (const g of groups) {
      for (const f of g.feedback) {
        if (f.feedbackType === 'revision_required') revisions++
        else if (f.feedbackType === 'rejected') rejected++
        else if (f.feedbackType === 'approved') approved++
      }
    }
    return { flats: groups.length, revisions, rejected, approved }
  }, [groups])

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
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">QA Feedback</h1>
          <p className="text-[11px] text-ink-400">
            {showAll ? 'All feedback' : 'New only'}
            {totalUnseen > 0 ? ` · ${totalUnseen} unseen` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant={showAll ? 'outline' : 'primary'}
            size="sm"
            className={compactBtn}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'New only' : 'Show all'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={compactBtn}
            onClick={() => reload()}
            aria-label="Refresh"
          >
            <RefreshCw size={13} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard index={0} label="Flats" value={stats.flats} icon={Building2} />
          <StatCard
            index={1}
            label="Revision"
            value={stats.revisions}
            icon={AlertTriangle}
            colorClass="text-warning-600 bg-warning-100"
          />
          <StatCard
            index={2}
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            colorClass="text-danger-600 bg-danger-100"
          />
          <StatCard
            index={3}
            label="Approved"
            value={stats.approved}
            icon={CheckCircle2}
            colorClass="text-success-600 bg-success-100"
          />
        </div>
      )}

      {error && (
        <Card className="border-danger-600/20 bg-danger-100/40 px-3 py-2 text-xs text-danger-600 shadow-xs">
          {error} — is the backend updated?
        </Card>
      )}

      {loading && groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={showAll ? 'No QA feedback yet' : 'No new QA feedback'}
          description="When QA marks Revision or Reject on a task, it appears here."
          className="py-10"
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={showAll ? 'all' : 'new'}
            className="space-y-1.5"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            {groups.map((group, i) => {
              const isOpen = expanded.has(group.flatId)

              return (
                <motion.div
                  key={group.flatId}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={stagger(Math.min(i, 12))}
                >
                  <Card className="relative overflow-hidden shadow-xs">
                    <span
                      className="absolute inset-y-0 left-0 w-0.5 bg-warning-600"
                      aria-hidden
                    />

                    <div className="flex items-start gap-2 pl-3 pr-2 pt-2.5 pb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <h2 className="text-sm font-semibold text-ink-950">
                            Flat {group.flatNumber}
                          </h2>
                          <StatusBadge status={group.flatStatus} />
                          {group.unseenCount > 0 && (
                            <span className="rounded-full bg-warning-100 px-1.5 py-0.5 text-[10px] font-bold text-warning-600">
                              {group.unseenCount} new
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-ink-400">
                          {group.towerName} · QA: {group.qaName} ·{' '}
                          {group.lastFeedbackAt
                            ? formatDistanceToNow(new Date(group.lastFeedbackAt), {
                                addSuffix: true,
                              })
                            : '—'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Link
                          to={ROUTES.ENGINEER_FLAT(group.flatId)}
                          className={cn(
                            'inline-flex items-center justify-center gap-1 rounded-md border border-ink-200 bg-white px-2',
                            compactBtn,
                            'font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-600 touch-manipulation'
                          )}
                        >
                          <Eye size={12} aria-hidden="true" />
                          Open
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          loading={markingFlat === group.flatId}
                          onClick={() => handleMarkFlatSeen(group.flatId, group.flatNumber)}
                          className={compactBtn}
                        >
                          <CheckCheck size={12} aria-hidden="true" />
                          Seen
                        </Button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(group.flatId)}
                      className="flex w-full items-center justify-between border-t border-ink-100 bg-ink-50/60 px-3 py-1.5 text-[11px] font-semibold text-ink-500 hover:bg-ink-50 touch-manipulation"
                    >
                      <span>
                        {isOpen ? 'Hide' : 'Show'} {group.feedback.length} item
                        {group.feedback.length === 1 ? '' : 's'}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={reduced ? { duration: 0 } : { duration: 0.28, ease: easeOut }}
                      >
                        <ChevronDown size={14} />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.ul
                          initial={reduced ? false : { height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={reduced ? undefined : { height: 0, opacity: 0 }}
                          transition={{ duration: 0.32, ease: easeOut }}
                          className="divide-y divide-ink-100 overflow-hidden border-t border-ink-100"
                        >
                          {group.feedback.map((item: EngineerFeedbackEntry) => {
                            const meta = feedbackMeta(item.feedbackType)
                            const Icon = meta.Icon
                            return (
                              <li key={item.id} className="px-3 py-2">
                                <div className="flex items-start gap-2">
                                  <div
                                    className={cn(
                                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                                      meta.chip
                                    )}
                                  >
                                    <Icon size={12} aria-hidden />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-[13px] font-semibold text-ink-950">
                                          {item.itemLabel}
                                        </p>
                                        <p className="text-[10px] text-ink-400">{item.categoryName}</p>
                                      </div>
                                      <span className="shrink-0 text-[10px] text-ink-400">
                                        {formatDistanceToNow(new Date(item.createdAt), {
                                          addSuffix: true,
                                        })}
                                      </span>
                                    </div>
                                    <p className={cn('mt-0.5 text-[11px] font-semibold', meta.tone)}>
                                      {FEEDBACK_LABEL[item.feedbackType] ?? item.feedbackType}
                                    </p>
                                    {item.remark && (
                                      <p className="mt-1 rounded-md bg-ink-50 px-2 py-1.5 text-[12px] text-ink-600">
                                        {item.remark}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
