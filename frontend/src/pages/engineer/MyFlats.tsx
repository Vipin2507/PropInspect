import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Search } from 'lucide-react'
import { useFlats } from '../../hooks/useFlats'
import { Badge } from '../../components/ui/Badge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ROUTES } from '../../constants/routes'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'revision', label: 'Revision' },
]

function flatProgress(flat: { status: string }) {
  if (flat.status === 'approved') return 100
  if (flat.status === 'submitted') return 100
  if (flat.status === 'in_progress') return 40
  return 0
}

export default function MyFlats() {
  const { flats, loading } = useFlats()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('pending')

  const filteredFlats = useMemo(() => {
    let list = flats
    if (tab === 'pending') {
      list = list.filter((f) => ['not_started', 'in_progress'].includes(f.status))
    } else if (tab === 'submitted') {
      list = list.filter((f) => f.status === 'submitted')
    } else if (tab === 'revision') {
      list = list.filter((f) => f.status === 'revision_required')
    }

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (f) =>
          f.flatNumber.toLowerCase().includes(q) ||
          f.towerName?.toLowerCase().includes(q) ||
          f.floorLabel?.toLowerCase().includes(q)
      )
    }
    return list
  }, [flats, search, tab])

  const getTabCount = (tabId: string) => {
    if (tabId === 'all') return flats.length
    if (tabId === 'pending')
      return flats.filter((f) => ['not_started', 'in_progress'].includes(f.status)).length
    if (tabId === 'submitted') return flats.filter((f) => f.status === 'submitted').length
    if (tabId === 'revision') return flats.filter((f) => f.status === 'revision_required').length
    return 0
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Assigned Flats</h1>
        <div className="relative mt-4">
          <Search
            size={20}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Flat No, Tower, Floor..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mb-4 border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'shrink-0 rounded-t-md border-b-2 px-3 py-2.5 text-sm font-semibold touch-manipulation',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600'
              )}
            >
              {t.label}{' '}
              <span className="text-xs font-normal text-slate-500">({getTabCount(t.id)})</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredFlats.length === 0 ? (
        <EmptyState
          title="No Flats Found"
          description={search ? 'Try adjusting your search.' : `You have no ${tab} flats.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFlats.map((flat) => {
            const progress = flatProgress(flat)
            return (
              <Link
                key={flat.id}
                to={ROUTES.ENGINEER_FLAT(flat.id)}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all active:scale-[0.99] [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-slate-800">{flat.flatNumber}</h2>
                      <p className="truncate text-sm text-slate-500">
                        {flat.towerName} · {flat.floorLabel}
                      </p>
                    </div>
                  </div>
                  <Badge status={flat.status} />
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar pct={progress} className="mt-1" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
