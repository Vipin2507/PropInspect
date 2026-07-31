import { useMemo, useState } from 'react'
import { ClipboardCheck, CheckCircle, List, ScrollText, Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { StatusDonut, CHART_COLORS } from '../../components/ui/StatusDonut'
import { DashboardDrilldown, type DrilldownItem } from '../../components/ui/DashboardDrilldown'
import { useReviewHistory, useReviewQueue } from '../../hooks/useReviews'
import { useQaChangesCount } from '../../hooks/useQaChanges'
import { useNotificationStore } from '../../store/notificationStore'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { Spinner } from '../../components/ui/Spinner'
import { useMotionSafe } from '../../hooks/useMotionSafe'

type CardKey = 'submitted' | 'changes' | 'approved' | 'reviewed'

type QueueItem = {
  inspectionId: string
  flatNumber: string
  engineerName: string
  submittedAt: string
  towerName?: string
}

type HistoryItem = {
  id: string
  inspectionId: string
  flatNumber: string
  engineerName?: string
  decision?: string
  status?: string
  reviewedAt?: string
}

export default function QADashboard() {
  const { items, loading } = useReviewQueue()
  const { history, loading: historyLoading } = useReviewHistory()
  const { count: unreviewedChanges } = useQaChangesCount()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const navigate = useNavigate()
  const { fadeUp, reduced } = useMotionSafe()
  const [activeCard, setActiveCard] = useState<CardKey | null>(null)

  const queue = items as QueueItem[]
  const historyItems = history as HistoryItem[]

  const approvedCount = historyItems.filter(
    (h) => (h.decision || h.status) === 'approved'
  ).length

  const selectCard = (key: CardKey) => {
    if (key === 'changes') {
      navigate(ROUTES.QA_CHANGES)
      return
    }
    setActiveCard((prev) => (prev === key ? null : key))
  }

  const drill = useMemo(() => {
    if (!activeCard) return { title: '', items: [] as DrilldownItem[] }

    if (activeCard === 'submitted') {
      return {
        title: 'Submitted for review',
        items: queue.map((q) => ({
          id: q.inspectionId,
          title: q.flatNumber,
          subtitle: q.engineerName,
          meta: q.submittedAt ? new Date(q.submittedAt).toLocaleDateString() : undefined,
          status: 'submitted',
          href: ROUTES.QA_REVIEW_DETAIL(q.inspectionId),
        })),
      }
    }

    if (activeCard === 'approved') {
      const approved = historyItems.filter((h) => (h.decision || h.status) === 'approved')
      return {
        title: 'Approved reviews',
        items: approved.map((h) => ({
          id: h.id || h.inspectionId,
          title: h.flatNumber,
          subtitle: h.engineerName,
          meta: h.reviewedAt ? new Date(h.reviewedAt).toLocaleDateString() : undefined,
          status: 'approved',
          href: ROUTES.QA_REVIEW_DETAIL(h.inspectionId),
        })),
      }
    }

    // reviewed = full history
    return {
      title: 'Review history',
      items: historyItems.map((h) => ({
        id: h.id || h.inspectionId,
        title: h.flatNumber,
        subtitle: h.engineerName,
        meta: h.reviewedAt ? new Date(h.reviewedAt).toLocaleDateString() : undefined,
        status: h.decision || h.status || 'submitted',
        href: ROUTES.QA_REVIEW_DETAIL(h.inspectionId),
      })),
    }
  }, [activeCard, queue, historyItems])

  const preview = queue.slice(0, 5)

  const chartData = [
    { name: 'In queue', value: queue.length, fill: CHART_COLORS.submitted },
    { name: 'Changes', value: unreviewedChanges, fill: CHART_COLORS.revision },
  ].filter((d) => d.value > 0)

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">QA Dashboard</h1>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          index={0}
          label="Submitted"
          value={queue.length}
          icon={ClipboardCheck}
          selected={activeCard === 'submitted'}
          onClick={() => selectCard('submitted')}
        />
        <StatCard
          index={1}
          label="Changes"
          value={unreviewedChanges}
          icon={ScrollText}
          colorClass="text-warning-600 bg-warning-100"
          onClick={() => selectCard('changes')}
        />
        <StatCard
          index={2}
          label="Approved"
          value={historyLoading ? '…' : approvedCount}
          icon={CheckCircle}
          colorClass="text-success-600 bg-success-100"
          selected={activeCard === 'approved'}
          onClick={() => selectCard('approved')}
        />
        <StatCard
          index={3}
          label="Reviewed"
          value={historyLoading ? '…' : historyItems.length}
          icon={List}
          selected={activeCard === 'reviewed'}
          onClick={() => selectCard('reviewed')}
        />
      </div>

      {(unreadCount > 0 || unreviewedChanges > 0) && (
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <Link
              to={ROUTES.ENGINEER_NOTIFICATIONS}
              className="inline-flex min-h-[36px] flex-1 items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-xs transition-all duration-fast active:scale-[0.98] sm:flex-none"
            >
              <Bell size={14} aria-hidden />
              {unreadCount} new
            </Link>
          )}
          {unreviewedChanges > 0 && (
            <Link
              to={ROUTES.QA_CHANGES}
              className="inline-flex min-h-[36px] flex-1 items-center gap-2 rounded-md bg-warning-600 px-3 py-2 text-sm font-semibold text-white shadow-xs transition-all duration-fast active:scale-[0.98] sm:flex-none"
            >
              <ScrollText size={14} aria-hidden />
              {unreviewedChanges} updates
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-5">
        <Card className="p-3 lg:col-span-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Workload</p>
          {loading ? (
            <div className="flex h-[132px] items-center justify-center"><Spinner /></div>
          ) : (
            <>
              <StatusDonut
                data={chartData.length ? chartData : [{ name: 'Idle', value: 1, fill: '#E2E8F0' }]}
                height={132}
                centerValue={queue.length}
                centerLabel="queue"
              />
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {chartData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1 text-[10px] text-ink-600">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.fill }} />
                    {d.name} <span className="font-semibold tabular">{d.value}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="overflow-hidden p-0 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Submitted reviews</p>
            <button
              type="button"
              className="text-xs font-semibold text-brand-600"
              onClick={() => selectCard('submitted')}
            >
              All →
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : preview.length === 0 ? (
            <p className="px-3 py-6 text-center text-caption text-ink-400">No pending reviews</p>
          ) : (
            <ul>
              {preview.map((item, i) => (
                <motion.li
                  key={item.inspectionId}
                  initial={reduced ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  <Link
                    to={ROUTES.QA_REVIEW_DETAIL(item.inspectionId)}
                    className="flex min-h-[44px] items-center justify-between gap-2 border-b border-ink-50 px-3 py-2 last:border-0 active:bg-brand-50/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-800">{item.flatNumber}</p>
                      <p className="truncate text-[11px] text-ink-400">{item.engineerName}</p>
                    </div>
                    <span className="shrink-0 text-[11px] tabular text-ink-400">
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <DashboardDrilldown
        open={activeCard != null && activeCard !== 'changes'}
        title={drill.title}
        count={drill.items.length}
        items={drill.items}
        onClose={() => setActiveCard(null)}
        emptyTitle="Nothing here"
        emptyDescription="No items for this filter yet."
      />
    </motion.div>
  )
}
