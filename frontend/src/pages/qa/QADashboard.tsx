import { ClipboardCheck, CheckCircle, List, AlertCircle } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { useReviewQueue } from '../../hooks/useReviews'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export default function QADashboard() {
  const { items, loading } = useReviewQueue()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">QA Dashboard</h1>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Review" value={items.length} icon={ClipboardCheck} />
        <StatCard label="Approved Today" value={0} icon={CheckCircle} colorClass="text-pass bg-green-100" />
        <StatCard label="Total Reviewed" value={0} icon={List} />
        <StatCard label="Overdue" value={0} icon={AlertCircle} colorClass="text-fail bg-red-100" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold">Pending Reviews</h2>
            <Link to={ROUTES.QA_REVIEWS} className="text-sm text-primary">
              View All →
            </Link>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <ul className="space-y-3">
              {(items as { flatNumber: string; engineerName: string; submittedAt: string }[]).slice(0, 5).map((item, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold">{item.flatNumber}</span> — {item.engineerName}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold">Approval Breakdown</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Approved', value: 40 },
                  { name: 'Revision', value: 30 },
                  { name: 'Rejected', value: 10 },
                ]}
                dataKey="value"
                innerRadius={40}
                outerRadius={70}
              >
                <Cell fill="#16A34A" />
                <Cell fill="#F97316" />
                <Cell fill="#DC2626" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
