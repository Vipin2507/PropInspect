import { useReportsOverview } from '../../../hooks/useReports'
import { Button } from '../../../components/ui/Button'
import { reportsApi, projectsApi } from '../../../utils/api'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Spinner } from '../../../components/ui/Spinner'
import { cn } from '../../../utils/cn'
import { Download } from 'lucide-react'

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'engineers', label: 'Engineers' },
  { id: 'snags',     label: 'Snags' },
]

export default function Reports() {
  const { data, loading } = useReportsOverview()
  const [projects, setProjects]   = useState<{ id: string; name: string }[]>([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    projectsApi.list().then(({ data }) => setProjects(data))
  }, [])

  const exportCsv = async (projectId: string, type: string) => {
    const { data } = await reportsApi.export(projectId, type)
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }))
    const a   = document.createElement('a')
    a.href = url
    a.download = `report-${type}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const barData = data.projectStats.map((p) => ({
    name:           p.projectName.slice(0, 12),
    Approved:       p.approved,
    Pending:        p.notStarted + p.inProgress,
    'Revision Req': p.revisionRequired,
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Reports</h1>
        {projects.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportCsv(projects[0].id, 'flat')}>
            <Download size={16} aria-hidden="true" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold min-h-[44px] touch-manipulation',
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 active:bg-slate-50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Project Status Overview</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Approved"     stackId="a" fill="#16A34A" />
              <Bar dataKey="Pending"      stackId="a" fill="#D97706" />
              <Bar dataKey="Revision Req" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'engineers' && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <h2 className="px-4 pt-4 text-base font-semibold text-slate-800">Engineer Leaderboard</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 font-medium text-slate-600">Assigned</th>
                <th className="px-4 py-3 font-medium text-slate-600">Submitted</th>
                <th className="px-4 py-3 font-medium text-slate-600">Approved</th>
              </tr>
            </thead>
            <tbody>
              {data.engineerLeaderboard.map((e) => (
                <tr key={e.engineerId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{e.name}</td>
                  <td className="px-4 py-3 text-slate-600">{e.assigned}</td>
                  <td className="px-4 py-3 text-slate-600">{e.submitted}</td>
                  <td className="px-4 py-3 text-slate-600">{e.approved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'snags' && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Snag Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'Open',      value: data.snagSummary.open,      color: 'text-fail' },
              { label: 'Rectified', value: data.snagSummary.rectified, color: 'text-secondary' },
              { label: 'Closed',    value: data.snagSummary.closed,    color: 'text-pass' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">{row.label}</span>
                <span className={cn('text-lg font-bold', row.color)}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
