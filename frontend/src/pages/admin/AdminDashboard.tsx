import { useState, useEffect, useMemo, useCallback } from 'react'
import { useReportsOverview } from '../../hooks/useReports'
import { cacheKey, readLsCache, writeLsCache } from '../../utils/offlineCache'
import { useProjects } from '../../hooks/useProjects'
import { useUsers } from '../../hooks/useUsers'
import { reportsApi } from '../../utils/api'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import {
  Home, CheckCircle, Clock, AlertTriangle,
  Send, RotateCcw, XCircle, Filter, X, TrendingUp,
  Users, ChevronDown, ChevronUp, Download, Building2, PackageCheck,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format } from 'date-fns'
import { StatusDonut, CHART_COLORS } from '../../components/ui/StatusDonut'
import { motion } from 'framer-motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

// ── Types ──────────────────────────────────────────────────────────────────
interface FilterState {
  projectId: string; engineerId: string; status: string
  dateFrom: string;  dateTo: string
}

interface FlatRow {
  flatId: string; flatNumber: string; flatStatus: string; towerName: string
  projectName: string; projectId: string; engineerName: string; engineerId: string
  inspectionStatus: string; submittedAt: string; lastUpdated: string
  passCount: number; failCount: number; pendingCount: number; openSnags: number
}

interface Summary {
  total: number; notStarted: number; inProgress: number; submitted: number
  approved: number; rejected: number; revisionRequired: number; desnagging: number
  handedOver: number; openSnags: number
}

const FLAT_STATUS_OPTIONS = [
  { value: '',                  label: 'All Statuses' },
  { value: 'not_started',       label: 'Not Started' },
  { value: 'in_progress',       label: 'In Progress' },
  { value: 'submitted',         label: 'Submitted for Review' },
  { value: 'approved',          label: 'Approved / Completed' },
  { value: 'revision_required', label: 'Revision Required' },
  { value: 'rejected',          label: 'Rejected' },
  { value: 'desnagging',        label: 'Desnagging' },
  { value: 'handed_over',       label: 'Handed Over to Client' },
]

const STATUS_COLOR: Record<string, string> = {
  approved:          CHART_COLORS.approved,
  submitted:         CHART_COLORS.submitted,
  in_progress:       CHART_COLORS.in_progress,
  revision_required: CHART_COLORS.revision,
  rejected:          CHART_COLORS.rejected,
  desnagging:        CHART_COLORS.desnagging,
  not_started:       CHART_COLORS.not_started,
  handed_over:       CHART_COLORS.handed_over,
}

// ── Helpers ────────────────────────────────────────────────────────────────
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600">
      {label}
      <button type="button" onClick={onRemove} className="ml-0.5 touch-manipulation" aria-label="Remove filter">
        <X size={11} aria-hidden="true" />
      </button>
    </span>
  )
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100,pct)}%`, background: color }} />
    </div>
  )
}

// Custom tooltip for Recharts
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-ink-100 bg-white p-2.5 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-ink-800">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-ink-600">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.fill }} />
          {p.name}: <span className="font-bold tabular text-ink-800">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data: overview }       = useReportsOverview()
  const { projects }             = useProjects()
  const { users: engineers }     = useUsers('engineer')

  const [filters, setFilters]       = useState<FilterState>({ projectId:'', engineerId:'', status:'', dateFrom:'', dateTo:'' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [result, setResult]         = useState<{ summary: Summary; flats: FlatRow[] } | null>(null)
  const [loading, setLoading]       = useState(true)
  const [showTable, setShowTable]   = useState(false)
  const [sortCol, setSortCol]       = useState<keyof FlatRow>('flatNumber')
  const [sortAsc, setSortAsc]       = useState(true)

  const activeFilterCount = [filters.projectId, filters.engineerId, filters.status, filters.dateFrom, filters.dateTo].filter(Boolean).length
  const hasFilters = activeFilterCount > 0

  const flatsCacheKey = (params: Record<string, string>) =>
    cacheKey('reports_flats_cache', params)

  // ── Always fetch — with or without filters ────────────────────────────
  const fetch = useCallback(async () => {
    setLoading(true)
    const params: Record<string,string> = {}
    if (filters.projectId)  params.projectId  = filters.projectId
    if (filters.engineerId) params.engineerId = filters.engineerId
    if (filters.status)     params.status     = filters.status
    if (filters.dateFrom)   params.dateFrom   = filters.dateFrom
    if (filters.dateTo)     params.dateTo     = filters.dateTo

    const key = flatsCacheKey(params)
    const cached = readLsCache<{ summary: Summary; flats: FlatRow[] }>(key)
    if (cached) {
      setResult(cached)
      setLoading(false)
    }

    try {
      const { data } = await reportsApi.flats(params)
      writeLsCache(key, data)
      setResult(data)
    } catch {
      if (!cached) setResult(null)
    }
    finally  { setLoading(false) }
  }, [filters])

  useEffect(() => { fetch() }, [fetch])

  const clearFilters = () =>
    setFilters({ projectId:'', engineerId:'', status:'', dateFrom:'', dateTo:'' })

  // ── Summary — always from API result (respects all filters) ──────────
  const s = result?.summary

  // ── Bar chart — group filtered flats by project ───────────────────────
  const barData = useMemo(() => {
    if (!result?.flats.length) return []
    const map = new Map<string, { name: string; Approved:number; Submitted:number; InProgress:number; Revision:number; Rejected:number; Desnagging:number; NotStarted:number; HandedOver:number }>()
    for (const f of result.flats) {
      if (!map.has(f.projectId)) {
        map.set(f.projectId, { name: f.projectName.slice(0,16), Approved:0, Submitted:0, InProgress:0, Revision:0, Rejected:0, Desnagging:0, NotStarted:0, HandedOver:0 })
      }
      const entry = map.get(f.projectId)!
      if (f.flatStatus === 'approved')          entry.Approved++
      else if (f.flatStatus === 'submitted')    entry.Submitted++
      else if (f.flatStatus === 'in_progress')  entry.InProgress++
      else if (f.flatStatus === 'revision_required') entry.Revision++
      else if (f.flatStatus === 'rejected')     entry.Rejected++
      else if (f.flatStatus === 'desnagging')   entry.Desnagging++
      else if (f.flatStatus === 'not_started')  entry.NotStarted++
      else if (f.flatStatus === 'handed_over')  entry.HandedOver++
    }
    return Array.from(map.values())
  }, [result])

  // ── Donut chart ──────────────────────────────────────────────────────
  const donutData = useMemo(() => {
    if (!s) return []
    return [
      { name: 'Handed Over', value: s.handedOver ?? 0,      fill: STATUS_COLOR.handed_over },
      { name: 'Approved',    value: s.approved,             fill: STATUS_COLOR.approved },
      { name: 'Submitted',   value: s.submitted,            fill: STATUS_COLOR.submitted },
      { name: 'In Progress', value: s.inProgress,           fill: STATUS_COLOR.in_progress },
      { name: 'Revision',    value: s.revisionRequired,     fill: STATUS_COLOR.revision_required },
      { name: 'Rejected',    value: s.rejected,             fill: STATUS_COLOR.rejected },
      { name: 'Desnagging',  value: s.desnagging,           fill: STATUS_COLOR.desnagging },
      { name: 'Not Started', value: s.notStarted,           fill: STATUS_COLOR.not_started },
    ].filter(d => d.value > 0)
  }, [s])

  // ── Sorted flat list ─────────────────────────────────────────────────
  const sortedFlats = useMemo(() => {
    if (!result?.flats) return []
    return [...result.flats].sort((a,b) => {
      const va = a[sortCol] ?? ''; const vb = b[sortCol] ?? ''
      const c = String(va).localeCompare(String(vb), undefined, { numeric:true })
      return sortAsc ? c : -c
    })
  }, [result, sortCol, sortAsc])

  const toggleSort = (col: keyof FlatRow) => {
    if (sortCol === col) setSortAsc(p => !p)
    else { setSortCol(col); setSortAsc(true) }
  }

  // ── Export ───────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (!result?.flats.length) return
    const hdr = 'Flat,Tower,Project,Engineer,Status,Pass,Fail,Pending,Open Snags,Last Updated\n'
    const rows = result.flats.map(f =>
      `${f.flatNumber},${f.towerName},${f.projectName},${f.engineerName||''},${f.flatStatus},${f.passCount},${f.failCount},${f.pendingCount},${f.openSnags},${f.lastUpdated?format(new Date(f.lastUpdated),'yyyy-MM-dd'):''}`
    ).join('\n')
    const url = URL.createObjectURL(new Blob([hdr+rows],{type:'text/csv'}))
    const a = document.createElement('a'); a.href=url
    a.download=`dashboard-${format(new Date(),'yyyy-MM-dd')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const projectLabel  = projects.find(p => p.id === filters.projectId)?.name
  const engineerLabel = engineers.find(e => e.id === filters.engineerId)?.name
  const statusLabel   = FLAT_STATUS_OPTIONS.find(o => o.value === filters.status)?.label

  const completionPct = s?.total
    ? Math.round(((s.approved + (s.handedOver ?? 0)) / s.total) * 100)
    : 0

  const { fadeUp } = useMotionSafe()

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Dashboard</h1>
          <p className="text-[11px] text-ink-400">
            {hasFilters ? `${activeFilterCount} filter${activeFilterCount>1?'s':''} active` : 'All projects — live'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {result && result.flats.length > 0 && (
            <Button variant="outline" size="sm" className="!min-h-[36px] !px-2.5 !py-1.5 text-xs" onClick={exportCsv}>
              <Download size={13} aria-hidden="true" /> Export
            </Button>
          )}
          <Button
            size="sm"
            className="!min-h-[36px] !px-2.5 !py-1.5 text-xs"
            variant={filtersOpen ? 'primary' : 'outline'}
            onClick={() => setFiltersOpen(p => !p)}
          >
            <Filter size={13} aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand-600">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Filter panel ───────────────────────────────────────────── */}
      {filtersOpen && (
        <Card className="border-brand-200 bg-brand-50/50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Project</label>
              <Select value={filters.projectId} onChange={e => setFilters(p => ({...p, projectId: e.target.value}))}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Engineer</label>
              <Select value={filters.engineerId} onChange={e => setFilters(p => ({...p, engineerId: e.target.value}))}>
                <option value="">All Engineers</option>
                {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Flat Status</label>
              <Select value={filters.status} onChange={e => setFilters(p => ({...p, status: e.target.value}))}>
                {FLAT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Updated From</label>
              <input type="date" value={filters.dateFrom}
                onChange={e => setFilters(p => ({...p, dateFrom: e.target.value}))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
                style={{fontSize:'16px'}}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Updated To</label>
              <input type="date" value={filters.dateTo}
                onChange={e => setFilters(p => ({...p, dateTo: e.target.value}))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
                style={{fontSize:'16px'}}
              />
            </div>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm font-semibold text-danger-600 active:underline">
              Clear all filters
            </button>
          )}
        </Card>
      )}

      {/* ── Active filter pills ─────────────────────────────────────── */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {projectLabel  && <FilterPill label={`Project: ${projectLabel}`}  onRemove={() => setFilters(p=>({...p,projectId:''}))} />}
          {engineerLabel && <FilterPill label={`Engineer: ${engineerLabel}`} onRemove={() => setFilters(p=>({...p,engineerId:''}))} />}
          {statusLabel && filters.status && <FilterPill label={`Status: ${statusLabel}`} onRemove={() => setFilters(p=>({...p,status:''}))} />}
          {filters.dateFrom && <FilterPill label={`From: ${filters.dateFrom}`} onRemove={() => setFilters(p=>({...p,dateFrom:''}))} />}
          {filters.dateTo   && <FilterPill label={`To: ${filters.dateTo}`}     onRemove={() => setFilters(p=>({...p,dateTo:''}))} />}
        </div>
      )}

      {/* ── Stat cards — ALWAYS from filtered API result ─────────────── */}
      {loading ? (
        <div className="flex justify-center py-6"><Spinner size="lg" /></div>
      ) : s ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            <StatCard index={0} label="Total" value={s.total} icon={Home} />
            <StatCard index={1} label="Approved" value={s.approved} icon={CheckCircle} colorClass="text-success-600 bg-success-100" />
            <StatCard index={2} label="Submitted" value={s.submitted} icon={Send} colorClass="text-warning-600 bg-warning-100" />
            <StatCard index={3} label="In Progress" value={s.inProgress} icon={Clock} colorClass="text-brand-600 bg-brand-100" />
            <StatCard index={4} label="Not Started" value={s.notStarted} icon={Building2} colorClass="text-ink-600 bg-ink-100" />
            <StatCard index={5} label="Revision" value={s.revisionRequired} icon={RotateCcw} colorClass="text-warning-600 bg-warning-100" />
            <StatCard index={6} label="Rejected" value={s.rejected} icon={XCircle} colorClass="text-danger-600 bg-danger-100" />
            <StatCard index={7} label="Handed Over" value={s.handedOver ?? 0} icon={PackageCheck} colorClass="text-accent-500 bg-accent-100" />
            <StatCard index={8} label="Open Snags" value={s.openSnags} icon={AlertTriangle} colorClass="text-danger-600 bg-danger-100" />
          </div>

          {s.total > 0 && (
            <div className="grid gap-2 lg:grid-cols-5">
              <Card className="p-3 lg:col-span-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                    Completion
                  </span>
                  <span className="font-display text-lg font-bold tabular text-success-600">{completionPct}%</span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                  {donutData.map((d, i) => (
                    <div
                      key={i}
                      title={`${d.name}: ${d.value}`}
                      className="transition-[width] duration-slow ease-out"
                      style={{
                        width: `${(d.value / s.total) * 100}%`,
                        background: d.fill,
                        minWidth: d.value > 0 ? 2 : 0,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {donutData.map(d => (
                    <span key={d.name} className="flex items-center gap-1 text-[10px] text-ink-600">
                      <span className="h-1.5 w-1.5 rounded-sm" style={{ background: d.fill }} />
                      {d.name} <span className="font-semibold tabular">{d.value}</span>
                    </span>
                  ))}
                </div>
              </Card>
              <Card className="p-3 lg:col-span-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Distribution</p>
                <StatusDonut
                  data={donutData}
                  height={120}
                  centerValue={`${completionPct}%`}
                  centerLabel="done"
                />
              </Card>
            </div>
          )}
        </>
      ) : (
        <EmptyState title="No data available" description="Try adjusting your filters or check back later." className="py-6" />
      )}

      {/* ── Charts ─────────────────────────────────────────────────── */}
      {!loading && barData.length > 0 && (
        <Card className="p-3">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
            Flat Status by Project
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={barData}
              margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
              barCategoryGap="28%"
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,155,255,0.06)' }} />
              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                iconType="circle"
                iconSize={7}
              />
              <Bar dataKey="Approved"   stackId="a" fill={STATUS_COLOR.approved}          name="Approved" isAnimationActive animationDuration={500} />
              <Bar dataKey="Submitted"  stackId="a" fill={STATUS_COLOR.submitted}         name="Submitted" />
              <Bar dataKey="InProgress" stackId="a" fill={STATUS_COLOR.in_progress}       name="In Progress" />
              <Bar dataKey="Revision"   stackId="a" fill={STATUS_COLOR.revision_required} name="Revision" />
              <Bar dataKey="Rejected"   stackId="a" fill={STATUS_COLOR.rejected}          name="Rejected" />
              <Bar dataKey="Desnagging" stackId="a" fill={STATUS_COLOR.desnagging}        name="Desnagging" />
              <Bar dataKey="HandedOver" stackId="a" fill={STATUS_COLOR.handed_over}       name="Handed Over" />
              <Bar dataKey="NotStarted" stackId="a" fill={STATUS_COLOR.not_started}       name="Not Started" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Engineer performance ────────────────────────────────────── */}
      {!loading && overview?.engineerLeaderboard && overview.engineerLeaderboard.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-4 flex items-center gap-2 text-label uppercase tracking-wide text-ink-700">
            <Users size={14} className="text-brand-600" aria-hidden="true" />
            Engineer Performance
          </h2>
          <div className="space-y-4">
            {overview.engineerLeaderboard
              .filter(e => !filters.engineerId || e.engineerId === filters.engineerId)
              .slice(0,8)
              .map(e => {
                const total = (e.submitted||0) + (e.approved||0) + (e.rejected||0)
                const pct   = total ? Math.round(((e.approved||0) / total) * 100) : 0
                return (
                  <div key={e.engineerId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-800">{e.name}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-bold text-pass">{e.approved} approved</span>
                        <span className="text-amber-600">{e.submitted} submitted</span>
                        {(e as any).revisionRequired > 0 && (
                          <span className="text-secondary">{(e as any).revisionRequired} revision</span>
                        )}
                        {e.rejected > 0 && <span className="text-fail">{e.rejected} rejected</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MiniBar pct={pct} color={STATUS_COLOR.approved} />
                      <span className="w-10 text-right text-xs font-bold text-slate-600">{pct}%</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* ── Flat detail table ───────────────────────────────────────── */}
      {!loading && result && result.flats.length > 0 && (
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTable(p => !p)}
            className="flex w-full touch-manipulation items-center justify-between px-4 py-4"
          >
            <div className="text-left">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Flat Details
              </h2>
              <p className="text-xs text-slate-400">{sortedFlats.length} flats</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {showTable ? 'Collapse' : 'Expand'}
              {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {showTable && (
            <div className="border-t border-slate-100 px-4 pb-4 pt-3">
              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {sortedFlats.map(f => {
                  const items = f.passCount + f.failCount + f.pendingCount
                  const pct   = items ? Math.round(((f.passCount+f.failCount)/items)*100) : 0
                  return (
                    <div key={f.flatId} className={cn(
                      'rounded-xl border p-3',
                      f.flatStatus === 'approved'          ? 'border-green-100 bg-green-50/40' :
                      f.flatStatus === 'revision_required' ? 'border-orange-100 bg-orange-50/30' :
                      f.flatStatus === 'rejected'          ? 'border-red-100 bg-red-50/30' :
                      'border-slate-100'
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800">{f.flatNumber}</p>
                          <p className="text-xs text-slate-500">{f.towerName} · {f.projectName}</p>
                          {f.engineerName && <p className="text-xs text-slate-400">Eng: {f.engineerName}</p>}
                        </div>
                        <StatusBadge status={f.flatStatus} />
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Checklist progress</span>
                          <span className="font-semibold">{pct}%</span>
                        </div>
                        <MiniBar pct={pct} color={STATUS_COLOR.approved} />
                        <div className="flex gap-4 text-xs pt-0.5">
                          <span className="text-pass font-semibold">✓ {f.passCount} pass</span>
                          <span className="text-fail font-semibold">✗ {f.failCount} fail</span>
                          {f.pendingCount > 0 && <span className="text-slate-400">⏳ {f.pendingCount}</span>}
                          {f.openSnags > 0 && <span className="text-secondary font-semibold">⚠ {f.openSnags} snags</span>}
                        </div>
                      </div>
                      {f.lastUpdated && (
                        <p className="mt-1.5 text-xs text-slate-400">
                          {format(new Date(f.lastUpdated), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {([
                        ['flatNumber','Flat'],['towerName','Tower'],['projectName','Project'],
                        ['engineerName','Engineer'],['flatStatus','Status'],
                        ['passCount','Pass'],['failCount','Fail'],['pendingCount','Pending'],
                        ['openSnags','Snags'],['lastUpdated','Updated'],
                      ] as [keyof FlatRow, string][]).map(([col,label]) => (
                        <th
                          key={col}
                          onClick={() => toggleSort(col)}
                          className="cursor-pointer select-none px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary"
                        >
                          <span className="flex items-center gap-1">
                            {label}
                            {sortCol === col && (sortAsc ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sortedFlats.map(f => (
                      <tr key={f.flatId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{f.flatNumber}</td>
                        <td className="px-3 py-2.5 text-slate-600">{f.towerName}</td>
                        <td className="px-3 py-2.5 text-slate-600 max-w-[120px] truncate">{f.projectName}</td>
                        <td className="px-3 py-2.5 text-slate-600">{f.engineerName || '—'}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={f.flatStatus} /></td>
                        <td className="px-3 py-2.5 font-semibold text-pass">{f.passCount}</td>
                        <td className="px-3 py-2.5 font-semibold text-fail">{f.failCount}</td>
                        <td className="px-3 py-2.5 text-slate-400">{f.pendingCount}</td>
                        <td className="px-3 py-2.5">
                          {f.openSnags > 0
                            ? <span className="font-bold text-secondary">{f.openSnags}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-400">
                          {f.lastUpdated ? format(new Date(f.lastUpdated),'dd MMM yy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Recent activity (no filters) ───────────────────────────── */}
      {!hasFilters && !loading && overview?.recentSubmissions && overview.recentSubmissions.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-label uppercase tracking-wide text-ink-700">
            <TrendingUp size={14} className="text-brand-600" aria-hidden="true" />
            Recent Submissions
          </h2>
          <ul className="divide-y divide-slate-100">
            {overview.recentSubmissions.slice(0,8).map((s,i) => (
              <li key={i} className="flex min-h-[52px] items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{s.flatNumber} · {s.towerName}</p>
                  <p className="truncate text-xs text-slate-500">{s.engineerName}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={s.status} />
                  <span className="text-xs text-slate-400">
                    {s.submittedAt ? format(new Date(s.submittedAt),'dd MMM') : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── No results ─────────────────────────────────────────────── */}
      {!loading && hasFilters && result?.flats.length === 0 && (
        <EmptyState
          title="No flats match these filters"
          description="Try adjusting or clearing your filters."
          actionLabel="Clear all filters"
          onAction={clearFilters}
        />
      )}
    </motion.div>
  )
}
