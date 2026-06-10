import { useState } from 'react'
import { useActivity } from '../../hooks/useActivity'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Select'
import { Activity, ClipboardCheck, Wrench } from 'lucide-react'
import { cn } from '../../utils/cn'

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'engineer', label: 'Engineers' },
  { value: 'qa', label: 'Checkers / QA' },
]

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Activity' },
  { value: 'inspection_update', label: 'Inspection Updates' },
  { value: 'review', label: 'Reviews' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:             { label: 'Draft',            color: 'text-slate-500 bg-slate-100' },
  submitted:         { label: 'Submitted',         color: 'text-blue-700 bg-blue-100' },
  approved:          { label: 'Approved',          color: 'text-green-700 bg-green-100' },
  rejected:          { label: 'Rejected',          color: 'text-red-700 bg-red-100' },
  revision_required: { label: 'Revision Required', color: 'text-orange-700 bg-orange-100' },
}

function statusBadge(status: string) {
  const s = STATUS_LABELS[status] ?? { label: status, color: 'text-slate-500 bg-slate-100' }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', s.color)}>
      {s.label}
    </span>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ActivityLog() {
  const { activity, loading } = useActivity(200)
  const [roleFilter, setRoleFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = activity.filter((a) => {
    if (roleFilter && a.userRole !== roleFilter) return false
    if (typeFilter && a.activityType !== typeFilter) return false
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Activity size={22} className="text-primary" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Activity Log</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
          {ROLE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by activity type">
          {TYPE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      {!loading && (
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{filtered.length}</span> entr{filtered.length !== 1 ? 'ies' : 'y'}
        </p>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No Activity Found" description="Try adjusting your filters." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:block">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>User</span>
              <span>Flat</span>
              <span>Project</span>
              <span>Status / Decision</span>
              <span>When</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {filtered.map((entry, i) => (
                <li key={i} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] items-center gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.activityType === 'review'
                        ? <ClipboardCheck size={14} className="shrink-0 text-primary" aria-hidden="true" />
                        : <Wrench size={14} className="shrink-0 text-amber-600" aria-hidden="true" />
                      }
                      <span className="truncate font-medium text-slate-800">{entry.userName}</span>
                    </div>
                    <span className={cn(
                      'mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                      entry.userRole === 'qa' ? 'bg-primary-light text-primary' : 'bg-amber-100 text-amber-700'
                    )}>
                      {entry.userRole === 'qa' ? 'Checker' : 'Engineer'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{entry.flatNumber}</p>
                    <p className="truncate text-xs text-slate-500">{entry.towerName}</p>
                  </div>
                  <p className="truncate text-sm text-slate-600">{entry.projectName}</p>
                  <div>{statusBadge(entry.inspectionStatus)}</div>
                  <p className="text-xs text-slate-500">{formatDate(entry.activityAt)}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((entry, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.activityType === 'review'
                        ? <ClipboardCheck size={14} className="shrink-0 text-primary" aria-hidden="true" />
                        : <Wrench size={14} className="shrink-0 text-amber-600" aria-hidden="true" />
                      }
                      <span className="font-semibold text-slate-800">{entry.userName}</span>
                    </div>
                    <span className={cn(
                      'mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                      entry.userRole === 'qa' ? 'bg-primary-light text-primary' : 'bg-amber-100 text-amber-700'
                    )}>
                      {entry.userRole === 'qa' ? 'Checker' : 'Engineer'}
                    </span>
                  </div>
                  {statusBadge(entry.inspectionStatus)}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {entry.flatNumber} · {entry.towerName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{entry.projectName}</p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-400">{formatDate(entry.activityAt)}</p>
                </div>
                {entry.comments && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 italic">
                    "{entry.comments}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
