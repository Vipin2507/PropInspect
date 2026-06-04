import { Building2, CheckCircle, Clock, Send } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { StatCard } from '../../components/ui/StatCard'
import { useFlats } from '../../hooks/useFlats'
import { Badge } from '../../components/ui/Badge'
const COLORS = ['#16A34A', '#D97706', '#F97316']

export default function EngineerDashboard() {
  const { flats, loading } = useFlats()
  const total = flats.length
  const completed = flats.filter((f) => ['approved', 'submitted'].includes(f.status)).length
  const pending = flats.filter((f) => ['not_started', 'in_progress', 'revision_required'].includes(f.status)).length
  const submitted = flats.filter((f) => f.status === 'submitted').length
  const pct = total ? Math.round((completed / total) * 100) : 0

  const chartData = [
    { name: 'Completed', value: completed },
    { name: 'Pending', value: pending },
    { name: 'Revision', value: flats.filter((f) => f.status === 'revision_required').length },
  ]

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Engineer Dashboard</h1>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Flats" value={total} icon={Building2} />
        <StatCard label="Completed" value={completed} icon={CheckCircle} colorClass="text-pass bg-green-100" />
        <StatCard label="Pending" value={pending} icon={Clock} colorClass="text-pending bg-amber-100" />
        <StatCard label="Submitted" value={submitted} icon={Send} colorClass="text-info bg-sky-100" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Overall Completion — {pct}%</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chartData} dataKey="value" innerRadius={50} outerRadius={80}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Recent Activity</h2>
          <ul className="space-y-3">
            {flats.slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <span>{f.flatNumber} · {f.towerName}</span>
                <Badge status={f.status}>{f.status.replace(/_/g, ' ')}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
