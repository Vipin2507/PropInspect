import { useReportsOverview } from '../../hooks/useReports'
import { StatCard } from '../../components/ui/StatCard'
import { Building2, Home, CheckCircle, Clock, AlertTriangle, Wrench, ShieldCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Spinner } from '../../components/ui/Spinner'

export default function AdminDashboard() {
  const { data, loading } = useReportsOverview()

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const totals = data.projectStats.reduce(
    (acc, p) => ({
      flats: acc.flats + p.totalFlats,
      approved: acc.approved + p.approved,
      pending: acc.pending + p.notStarted + p.inProgress,
    }),
    { flats: 0, approved: 0, pending: 0 }
  )

  const barData = data.projectStats.map((p) => ({
    name: p.projectName,
    Approved: p.approved,
    Pending: p.notStarted + p.inProgress,
    'Revision Req.': p.revisionRequired,
  }))

  const snagStats = [
    {
      label: 'Open Snags',
      value: data.snagSummary.open,
      icon: AlertTriangle,
      colorClass: 'text-fail bg-red-100',
    },
    {
      label: 'Rectified',
      value: data.snagSummary.rectified,
      icon: Wrench,
      colorClass: 'text-secondary bg-orange-100',
    },
    {
      label: 'Closed',
      value: data.snagSummary.closed,
      icon: ShieldCheck,
      colorClass: 'text-pass bg-green-100',
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Projects" value={data.projectStats.length} icon={Building2} />
        <StatCard label="Total Flats" value={totals.flats} icon={Home} />
        <StatCard
          label="Completed"
          value={totals.approved}
          icon={CheckCircle}
          colorClass="text-pass bg-green-100"
        />
        <StatCard
          label="Pending"
          value={totals.pending}
          icon={Clock}
          colorClass="text-pending bg-amber-100"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3">
          <h2 className="mb-4 font-semibold">Flat Status by Project</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '14px' }} />
              <Bar dataKey="Approved" stackId="a" fill="#16A34A" />
              <Bar dataKey="Pending" stackId="a" fill="#D97706" />
              <Bar dataKey="Revision Req." stackId="a" fill="#F97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Snag Summary</h2>
          <div className="space-y-4">
            {snagStats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                colorClass={stat.colorClass}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
