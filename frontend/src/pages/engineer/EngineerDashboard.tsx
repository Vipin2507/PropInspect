import { Building2, CheckCircle, Clock, Send, AlertTriangle, Plus } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { StatCard } from '../../components/ui/StatCard'
import { useFlats } from '../../hooks/useFlats'
import { useAuthStore } from '../../store/authStore'
import { Badge } from '../../components/ui/Badge'
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
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
          {isAdmin ? 'All Flats Overview' : `Hi, ${user?.name?.split(' ')[0] || 'Maker'}`}
        </h1>
        {!isAdmin && (
          <Button size="sm" onClick={() => navigate(ROUTES.ENGINEER_FLATS)}>
            <Plus size={16} aria-hidden="true" /> Start Inspection
          </Button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={isAdmin ? 'Total Flats' : 'Total Flats'}
          value={total}
          icon={Building2}
        />
        <StatCard
          label="Pending"
          value={pending}
          icon={Clock}
          colorClass="text-pending bg-amber-100"
        />
        <StatCard
          label="Completed"
          value={completed}
          icon={CheckCircle}
          colorClass="text-pass bg-green-100"
        />
        <StatCard
          label="Revision"
          value={revision}
          icon={AlertTriangle}
          colorClass="text-secondary bg-orange-100"
        />
      </div>

      {!isAdmin && unseenFeedback > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {unseenFeedback} QA feedback item{unseenFeedback === 1 ? '' : 's'} waiting
              </p>
              <p className="text-xs text-amber-700">Tasks sent for revision — open the QA Feedback log</p>
            </div>
            <Link
              to={ROUTES.ENGINEER_CHANGES}
              className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white active:bg-amber-700"
            >
              View Log
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Status Breakdown</h2>
          {total === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No flats in the system yet.
            </p>
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
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Recent Flats</h2>
            <Link
              to={ROUTES.ENGINEER_FLATS}
              className="text-sm font-medium text-primary active:underline"
            >
              View All →
            </Link>
          </div>
          {flats.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {flats.slice(0, 6).map((f) => (
                <Link
                  key={f.id}
                  to={ROUTES.ENGINEER_FLAT(f.id)}
                  className="flex min-h-[52px] items-center justify-between gap-3 py-3 active:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{f.flatNumber}</p>
                    <p className="truncate text-xs text-slate-500">
                      {f.towerName}
                      {isAdmin && f.inspection?.engineerName && ` · ${f.inspection.engineerName}`}
                    </p>
                  </div>
                  <Badge status={f.status} />
                </Link>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
