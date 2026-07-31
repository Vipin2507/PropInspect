import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useQaChanges } from '../../hooks/useQaChanges'
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
  CheckCheck, ChevronDown, Eye, RefreshCw, Building2,
  ScrollText, AlertCircle, MessageSquare,
} from 'lucide-react'
import type { TaskChangeLogEntry } from '../../types'

const compactBtn = '!min-h-[32px] !px-2 !py-1 text-[11px]'
const easeOut = [0.22, 1, 0.36, 1] as const

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
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const { groups, totalUnreviewed, loading, markFlatReviewed, reload } = useQaChanges()

  const stats = useMemo(() => {
    let fails = 0
    let remarks = 0
    let statusChanges = 0
    for (const g of groups) {
      for (const c of g.changes) {
        if (c.changeType === 'status_change') {
          statusChanges++
          if (c.newValue === 'fail') fails++
        } else {
          remarks++
        }
      }
    }
    return { flats: groups.length, updates: totalUnreviewed, fails, remarks, statusChanges }
  }, [groups, totalUnreviewed])

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
      toast.success(
        `Marked ${count} change${count === 1 ? '' : 's'} reviewed for Flat ${flatNumber}`
      )
    } catch {
      toast.error('Could not mark as reviewed')
    } finally {
      setMarkingFlat(null)
    }
  }

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Changes Log</h1>
          <p className="text-[11px] text-ink-400">
            Engineer task updates
            {totalUnreviewed > 0 ? ` · ${totalUnreviewed} unreviewed` : ''}
          </p>
        </div>
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

      {groups.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard index={0} label="Flats" value={stats.flats} icon={Building2} />
          <StatCard
            index={1}
            label="Updates"
            value={stats.updates}
            icon={ScrollText}
            colorClass="text-brand-600 bg-brand-100"
          />
          <StatCard
            index={2}
            label="Fails"
            value={stats.fails}
            icon={AlertCircle}
            colorClass="text-danger-600 bg-danger-100"
          />
          <StatCard
            index={3}
            label="Remarks"
            value={stats.remarks}
            icon={MessageSquare}
            colorClass="text-warning-600 bg-warning-100"
          />
        </div>
      )}

      {loading && groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No unreviewed changes"
          description="Engineer task updates will appear here as inspections are filled in."
          className="py-10"
        />
      ) : (
        <div className="space-y-1.5">
          {groups.map((group, i) => {
            const isOpen = expanded.has(group.flatId)
            const inspectionId = group.changes[0]?.inspectionId
            const previewCount = Math.min(3, group.changes.length)

            return (
              <motion.div
                key={group.flatId}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(Math.min(i, 12))}
              >
                <Card className="relative overflow-hidden shadow-xs">
                  <span className="absolute inset-y-0 left-0 w-0.5 bg-brand-500" aria-hidden />

                  <div className="flex items-start gap-2 pl-3 pr-2 pt-2.5 pb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <h2 className="text-sm font-semibold text-ink-950">
                          Flat {group.flatNumber}
                        </h2>
                        <StatusBadge status={group.flatStatus} />
                        <span className="rounded-full bg-warning-100 px-1.5 py-0.5 text-[10px] font-bold text-warning-600">
                          {group.unreviewedCount} update
                          {group.unreviewedCount === 1 ? '' : 's'}
                        </span>
                        <span className="text-[10px] tabular text-ink-400">
                          {group.completionPct}%
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-ink-400">
                        {group.towerName} · {group.engineerName} ·{' '}
                        {group.lastChangeAt
                          ? formatDistanceToNow(new Date(group.lastChangeAt), { addSuffix: true })
                          : '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {inspectionId && (
                        <Link
                          to={ROUTES.QA_REVIEW_DETAIL(inspectionId)}
                          className={cn(
                            'inline-flex items-center justify-center gap-1 rounded-md border border-ink-200 bg-white px-2',
                            compactBtn,
                            'font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-600 touch-manipulation'
                          )}
                        >
                          <Eye size={12} aria-hidden="true" />
                          View
                        </Link>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        loading={markingFlat === group.flatId}
                        onClick={() => handleMarkFlatReviewed(group.flatId, group.flatNumber)}
                        className={compactBtn}
                      >
                        <CheckCheck size={12} aria-hidden="true" />
                        Done
                      </Button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(group.flatId)}
                    className="flex w-full items-center justify-between border-t border-ink-100 bg-ink-50/60 px-3 py-1.5 text-[11px] font-semibold text-ink-500 hover:bg-ink-50 touch-manipulation"
                  >
                    <span>
                      {isOpen ? 'Hide' : 'Show'} {group.changes.length} change
                      {group.changes.length === 1 ? '' : 's'}
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
                        {group.changes.map((change) => (
                          <li key={change.id} className="px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-ink-950">
                                  {change.itemLabel}
                                </p>
                                <p className="text-[10px] text-ink-400">{change.categoryName}</p>
                                <p
                                  className={cn(
                                    'mt-0.5 text-[11px]',
                                    change.changeType === 'status_change' &&
                                      change.newValue === 'fail'
                                      ? 'font-semibold text-danger-600'
                                      : 'text-ink-600'
                                  )}
                                >
                                  {change.changeType === 'status_change' ? 'Status: ' : 'Remark: '}
                                  {formatChangeValue(change)}
                                </p>
                              </div>
                              <span className="shrink-0 text-[10px] text-ink-400">
                                {formatDistanceToNow(new Date(change.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>

                  {!isOpen && group.changes.length > previewCount && (
                    <p className="px-3 pb-2 text-[10px] text-ink-400">
                      +{group.changes.length - previewCount} more…
                    </p>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
