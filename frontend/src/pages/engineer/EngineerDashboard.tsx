import { Building2, CheckCircle, Clock, Send } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { StatCard } from '../../components/ui/StatCard'
import { useFlats } from '../../hooks/useFlats'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'

const COLORS = ['#16A34A', '#D97706', '#F97316']

export default function EngineerDashboard() {
  const { flats, loading } = useFlats()

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const total     = flats.length
  const completed = flats.filter((f) => ['approved', 'submitted'].includes(f.status)).length
  const pending   = flats.filter((f) => ['not_started', 'in_progress', 'revision_required'].includes(f.status)).length
  const submitted = flats.filter((f) => f.status === 'submitted').length
  const revision  = flats.filter((f) => f.status === 'revision_required').length

  const chartData = [
    { name: 'Completed', value: completed },
    { name: 'Pending',   value: pending },
    { name: 'Revision',  value: revision },
  ]

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Flats"  value={total}     icon={Building2} />
        <StatCard label="Completed"    value={completed} icon={CheckCircle} colorClass="text-pass bg-green-100" />
        <StatCard label="Pending"      value={pending}   icon={Clock}      colorClass="text-pending bg-amber-100" />
        <StatCard label="Submitted"    value={submitted} icon={Send}       colorClass="text-info bg-sky-100" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Completion Breakdown</h2>
          {total === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No flats assigned yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={45} outerRadius={70}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Recent Activity</h2>
          {flats.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {flats.slice(0, 6).map((f) => (
                <li key={f.id} className="flex min-h-[52px] items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{f.flatNumber}</p>
                    <p className="truncate text-xs text-slate-500">{f.towerName}</p>
                  </div>
                  <Badge status={f.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
