import { useReportsOverview } from '../../../hooks/useReports';
import { Button } from '../../../components/ui/Button';
import { reportsApi, projectsApi } from '../../../utils/api';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Spinner } from '../../../components/ui/Spinner';
import { cn } from '../../../utils/cn';
import { Download } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'engineers', label: 'Engineers' },
  { id: 'snags', label: 'Snags' },
];

export default function Reports() {
  const { data, loading } = useReportsOverview();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    projectsApi.list().then(({ data }) => setProjects(data));
  }, []);

  const exportCsv = async (projectId: string, type: string) => {
    const { data } = await reportsApi.export(projectId, type);
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const barData = data.projectStats.map((p) => ({
    name: p.projectName,
    Approved: p.approved,
    Pending: p.notStarted + p.inProgress,
    'Revision Req.': p.revisionRequired,
  }));

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="mb-4 text-2xl font-bold">Reports</h1>
        {projects.length > 0 && (
          <Button
            variant="outline"
            onClick={() => exportCsv(projects[0].id, 'flat')}
          >
            <Download size={16} className="mr-2" />
            Export Flat Data (CSV)
          </Button>
        )}
      </div>

      <div className="mt-4 border-b border-slate-200">
        <div className="-mb-px flex gap-2 overflow-x-auto whitespace-nowrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold capitalize',
                activeTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-primary'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 font-semibold">Project Status Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Approved" stackId="a" fill="#16A34A" />
                <Bar dataKey="Pending" stackId="a" fill="#D97706" />
                <Bar dataKey="Revision Req." stackId="a" fill="#F97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {activeTab === 'engineers' && (
          <div className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 font-semibold">Engineer Leaderboard</h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="p-3 font-medium text-slate-600">Name</th>
                  <th className="p-3 font-medium text-slate-600">Assigned</th>
                  <th className="p-3 font-medium text-slate-600">Submitted</th>
                  <th className="p-3 font-medium text-slate-600">Approved</th>
                </tr>
              </thead>
              <tbody>
                {data.engineerLeaderboard.map((e) => (
                  <tr key={e.engineerId} className="border-b last:border-0">
                    <td className="p-3">{e.name}</td>
                    <td className="p-3">{e.assigned}</td>
                    <td className="p-3">{e.submitted}</td>
                    <td className="p-3">{e.approved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'snags' && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 font-semibold">Snag Summary</h2>
            <div className="space-y-2 text-sm">
              <p>Open: {data.snagSummary.open}</p>
              <p>Rectified: {data.snagSummary.rectified}</p>
              <p>Closed: {data.snagSummary.closed}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
