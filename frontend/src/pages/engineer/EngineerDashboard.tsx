import { useMemo, useState } from 'react'
import { Building2, CheckCircle, Clock, AlertTriangle, Plus, Bell, ScrollText } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { StatusDonut, CHART_COLORS } from '../../components/ui/StatusDonut'
import { DashboardDrilldown, type DrilldownItem } from '../../components/ui/DashboardDrilldown'
import { useFlats } from '../../hooks/useFlats'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { useEngineerFeedbackCount } from '../../hooks/useEngineerFeedback'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import type { Flat } from '../../types'

type CardKey = 'total' | 'pending' | 'done' | 'revision'

const CARD_META: Record<CardKey, { title: string; match: (f: Flat) => boolean }> = {
  total: { title: 'All flats', match: () => true },
  pending: {
    title: 'Pending flats',
    match: (f) => f.status === 'not_started' || f.status === 'in_progress',
  },
  done: {
    title: 'Completed flats',
    match: (f) => f.status === 'approved' || f.status === 'submitted',
  },
  revision: {
    title: 'Revision required',
    match: (f) => f.status === 'revision_required',
  },
}

export default function EngineerDashboard() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const navigate = useNavigate()
  const { flats, loading } = useFlats()
  const { count: unseenFeedback } = useEngineerFeedbackCount()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const { fadeUp, reduced } = useMotionSafe()
  const [activeCard, setActiveCard] = useState<CardKey | null>(null)

  const selectCard = (key: CardKey) => {
    setActiveCard((prev) => (prev === key ? null : key))
  }

  const drillItems: DrilldownItem[] = useMemo(() => {
    if (!activeCard) return []
    return flats
      .filter(CARD_META[activeCard].match)
      .map((f) => ({
        id: f.id,
        title: f.flatNumber,
        subtitle: f.towerName,
        meta: isAdmin && f.inspection?.engineerName ? f.inspection.engineerName : undefined,
        status: f.status,
        href: ROUTES.ENGINEER_FLAT(f.id),
      }))
  }, [activeCard, flats, isAdmin])

  if (loading && flats.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  const total = flats.length
  const approved = flats.filter((f) => f.status === 'approved').length
  const submitted = flats.filter((f) => f.status === 'submitted').length
  const inProgress = flats.filter((f) => f.status === 'in_progress').length
  const pending = flats.filter((f) => ['not_started', 'in_progress'].includes(f.status)).length
  const revision = flats.filter((f) => f.status === 'revision_required').length
  const completed = approved + submitted

  const chartData = [
    { name: 'Approved', value: approved, fill: CHART_COLORS.approved },
    { name: 'Submitted', value: submitted, fill: CHART_COLORS.submitted },
    { name: 'In Progress', value: inProgress, fill: CHART_COLORS.in_progress },
    { name: 'Revision', value: revision, fill: CHART_COLORS.revision },
  ].filter((d) => d.value > 0)

  const recent = flats.slice(0, 4)

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-bold text-ink-950 md:text-xl">
            {isAdmin ? 'Overview' : `Hi, ${user?.name?.split(' ')[0] || 'Maker'}`}
          </h1>
        </div>
        {!isAdmin && (
          <Button size="sm" className="!min-h-[36px] shrink-0 !px-3 !py-1.5 text-sm" onClick={() => navigate(ROUTES.ENGINEER_FLATS)}>
            <Plus size={14} aria-hidden /> Start
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard index={0} label="Total" value={total} icon={Building2} selected={activeCard === 'total'} onClick={() => selectCard('total')} />
        <StatCard index={1} label="Pending" value={pending} icon={Clock} colorClass="text-warning-600 bg-warning-100" selected={activeCard === 'pending'} onClick={() => selectCard('pending')} />
        <StatCard index={2} label="Done" value={completed} icon={CheckCircle} colorClass="text-success-600 bg-success-100" selected={activeCard === 'done'} onClick={() => selectCard('done')} />
        <StatCard index={3} label="Revision" value={revision} icon={AlertTriangle} colorClass="text-warning-600 bg-warning-100" selected={activeCard === 'revision'} onClick={() => selectCard('revision')} />
      </div>

      {(unreadCount > 0 || (!isAdmin && unseenFeedback > 0)) && (
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
          {!isAdmin && unseenFeedback > 0 && (
            <Link
              to={ROUTES.ENGINEER_CHANGES}
              className="inline-flex min-h-[36px] flex-1 items-center gap-2 rounded-md bg-warning-600 px-3 py-2 text-sm font-semibold text-white shadow-xs transition-all duration-fast active:scale-[0.98] sm:flex-none"
            >
              <ScrollText size={14} aria-hidden />
              {unseenFeedback} feedback
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-5">
        <Card className="p-3 lg:col-span-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Status</p>
          <StatusDonut data={chartData} height={132} centerValue={total} centerLabel="flats" />
          {chartData.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {chartData.map((d) => (
                <span key={d.name} className="flex items-center gap-1 text-[10px] text-ink-600">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.fill }} />
                  {d.name} <span className="font-semibold tabular">{d.value}</span>
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden p-0 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Recent</p>
            <Link to={ROUTES.ENGINEER_FLATS} className="text-xs font-semibold text-brand-600">
              All →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-3 py-6 text-center text-caption text-ink-400">No flats yet</p>
          ) : (
            <ul>
              {recent.map((f, i) => (
                <motion.li
                  key={f.id}
                  initial={reduced ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  <Link
                    to={ROUTES.ENGINEER_FLAT(f.id)}
                    className="flex min-h-[44px] items-center justify-between gap-2 border-b border-ink-50 px-3 py-2 last:border-0 active:bg-brand-50/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-800">{f.flatNumber}</p>
                      <p className="truncate text-[11px] text-ink-400">
                        {f.towerName}
                        {isAdmin && f.inspection?.engineerName ? ` · ${f.inspection.engineerName}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={f.status} />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <DashboardDrilldown
        open={activeCard != null}
        title={activeCard ? CARD_META[activeCard].title : ''}
        count={drillItems.length}
        items={drillItems}
        onClose={() => setActiveCard(null)}
        emptyTitle="No flats here"
        emptyDescription="Nothing matches this status right now."
      />
    </motion.div>
  )
}
