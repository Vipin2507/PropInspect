import { Building2, CheckCircle, Clock, Send, AlertTriangle, Plus, Bell } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useFlats } from '../../hooks/useFlats'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { useEngineerFeedbackCount } from '../../hooks/useEngineerFeedback'

const COLORS = ['#16A34A', '#D97706', '#F97316', '#DC2626']

export default function EngineerDashboard() {
  const user    = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const navigate = useNavigate()
  const { flats, loading } = useFlats()
  const { count: unseenFeedback } = useEngineerFeedbackCount()
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  if (loading && flats.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const total      = flats.length
  const approved   = flats.filter((f) => f.status === 'approved').length
  const submitted  = flats.filter((f) => f.status === 'submitted').length
  const inProgress = flats.filter((f) => f.status === 'in_progress').length
  const pending    = flats.filter((f) => ['not_started', 'in_progress'].includes(f.status)).length
  const revision   = flats.filter((f) => f.status === 'revision_required').length
  const completed  = approved + submitted

  const chartData = [
    { name: 'Approved',    value: approved },
    { name: 'Submitted',   value: submitted },
    { name: 'In Progress', value: inProgress },
    { name: 'Revision',    value: revision },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-ink-950">
          {isAdmin ? 'All Flats Overview' : `Hi, ${user?.name?.split(' ')[0] || 'Maker'}`}
        </h1>
        {!isAdmin && (
          <Button size="sm" onClick={() => navigate(ROUTES.ENGINEER_FLATS)}>
            <Plus size={16} aria-hidden="true" /> Start Inspection
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Flats" value={total} icon={Building2} />
        <StatCard
          label="Pending"
          value={pending}
          icon={Clock}
          colorClass="text-warning-600 bg-warning-100"
        />
        <StatCard
          label="Completed"
          value={completed}
          icon={CheckCircle}
          colorClass="text-success-600 bg-success-100"
        />
        <StatCard
          label="Revision"
          value={revision}
          icon={AlertTriangle}
          colorClass="text-warning-600 bg-warning-100"
        />
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

      {!isAdmin && unseenFeedback > 0 && (
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-warning-600 to-warning-500 p-4 text-white shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {unseenFeedback} QA feedback item{unseenFeedback === 1 ? '' : 's'} waiting
              </p>
              <p className="text-xs text-white/80">Tasks sent for revision — open the QA Feedback log</p>
            </div>
            <Link
              to={ROUTES.ENGINEER_CHANGES}
              className="shrink-0 rounded-md bg-white px-4 py-2 text-sm font-semibold text-warning-600 active:brightness-95"
            >
              View Log
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-display text-base font-semibold text-ink-800">Status Breakdown</h2>
          {total === 0 ? (
            <EmptyState
              title="No flats yet"
              description="No flats in the system yet."
              className="py-8"
            />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={45} outerRadius={70}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink-800">Recent Flats</h2>
            <Link
              to={ROUTES.ENGINEER_FLATS}
              className="text-sm font-medium text-brand-600 active:underline"
            >
              View All →
            </Link>
          </div>
          {flats.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Your assigned flats will appear here."
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {flats.slice(0, 6).map((f) => (
                <Link
                  key={f.id}
                  to={ROUTES.ENGINEER_FLAT(f.id)}
                  className="flex min-h-[52px] items-center justify-between gap-3 py-3 active:bg-ink-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">{f.flatNumber}</p>
                    <p className="truncate text-xs text-ink-500">
                      {f.towerName}
                      {isAdmin && f.inspection?.engineerName && ` · ${f.inspection.engineerName}`}
                    </p>
                  </div>
                  <StatusBadge status={f.status} />
                </Link>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
