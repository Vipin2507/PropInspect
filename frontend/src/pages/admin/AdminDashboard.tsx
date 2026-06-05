import { useReportsOverview } from '../../hooks/useReports'
import { StatCard } from '../../components/ui/StatCard'
import { Building2, Home, CheckCircle, Clock, AlertTriangle, Wrench, ShieldCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Spinner } from '../../components/ui/Spinner'

export default function AdminDashboard() {
  const { data, loading } = useReportsOverview()

  if (loading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const totals = data.projectStats.reduce(
    (acc, p) => ({
      flats:    acc.flats    + p.totalFlats,
      approved: acc.approved + p.approved,
      pending:  acc.pending  + p.notStarted + p.inProgress,
    }),
    { flats: 0, approved: 0, pending: 0 }
  )

  const barData = data.projectStats.map((p) => ({
    name:           p.projectName.slice(0, 12),
    Approved:       p.approved,
    Pending:        p.notStarted + p.inProgress,
    'Revision Req': p.revisionRequired,
  }))

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Admin Dashboard</h1>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Projects"   value={data.projectStats.length} icon={Building2} />
        <StatCard label="Total Flats" value={totals.flats}  icon={Home} />
        <StatCard label="Completed"  value={totals.approved} icon={CheckCircle} colorClass="text-pass bg-green-100" />
        <StatCard label="Pending"    value={totals.pending}  icon={Clock}       colorClass="text-pending bg-amber-100" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Flat Status by Project</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Approved"     stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Pending"      stackId="a" fill="#D97706" />
              <Bar dataKey="Revision Req" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Snag Summary</h2>
          <div className="space-y-3">
            <StatCard label="Open Snags" value={data.snagSummary.open}      icon={AlertTriangle} colorClass="text-fail bg-red-100" />
            <StatCard label="Rectified"  value={data.snagSummary.rectified} icon={Wrench}        colorClass="text-secondary bg-orange-100" />
            <StatCard label="Closed"     value={data.snagSummary.closed}    icon={ShieldCheck}   colorClass="text-pass bg-green-100" />
          </div>
        </div>
      </div>

      {/* Recent submissions */}
      {data.recentSubmissions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Recent Submissions</h2>
          <ul className="divide-y divide-slate-100">
            {data.recentSubmissions.slice(0, 6).map((s, i) => (
              <li key={i} className="flex min-h-[52px] items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {s.flatNumber} · {s.towerName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{s.engineerName}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(s.submittedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
