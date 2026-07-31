import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Download, FileText, Users, AlertTriangle, CheckCircle, Wrench, Clock,
} from 'lucide-react'
import { useReportsOverview } from '../../../hooks/useReports'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { StatCard } from '../../../components/ui/StatCard'
import { Select } from '../../../components/ui/Select'
import { Spinner } from '../../../components/ui/Spinner'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { StatusDonut, CHART_COLORS } from '../../../components/ui/StatusDonut'
import { reportsApi, projectsApi } from '../../../utils/api'
import { useMotionSafe } from '../../../hooks/useMotionSafe'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'

type TabId = 'overview' | 'engineers' | 'snags'

const easeOut = [0.22, 1, 0.36, 1] as const
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'
const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'

const TABS: { value: TabId; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'engineers', label: 'Engineers' },
  { value: 'snags', label: 'Snags' },
]

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; fill?: string; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => Number(p.value) > 0)
  if (!rows.length) return null
  return (
    <div className="rounded-md border border-ink-100 bg-white p-2.5 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-ink-800">{label}</p>
      {rows.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-ink-600">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: p.fill || p.color }}
          />
          {p.name}: <span className="font-bold tabular text-ink-800">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function Reports() {
  const { data, loading } = useReportsOverview()
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [exportProjectId, setExportProjectId] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    projectsApi.list().then(({ data: list }) => {
      setProjects(list)
      if (list[0]) setExportProjectId(list[0].id)
    })
  }, [])

  const totals = useMemo(() => {
    if (!data) {
      return {
        flats: 0,
        approved: 0,
        pending: 0,
        revision: 0,
        snagOpen: 0,
        snagRectified: 0,
        snagClosed: 0,
        engineers: 0,
      }
    }
    let flats = 0
    let approved = 0
    let pending = 0
    let revision = 0
    for (const p of data.projectStats) {
      flats += p.totalFlats
      approved += p.approved
      pending += p.notStarted + p.inProgress
      revision += p.revisionRequired
    }
    return {
      flats,
      approved,
      pending,
      revision,
      snagOpen: data.snagSummary.open,
      snagRectified: data.snagSummary.rectified,
      snagClosed: data.snagSummary.closed,
      engineers: data.engineerLeaderboard.length,
    }
  }, [data])

  const barData = useMemo(() => {
    if (!data) return []
    return data.projectStats.map((p) => ({
      name: p.projectName.slice(0, 16),
      Approved: p.approved,
      Submitted: p.submitted,
      InProgress: p.inProgress,
      Revision: p.revisionRequired,
      Rejected: p.rejected,
      Desnagging: p.desnagging,
      HandedOver: p.handedOver,
      NotStarted: p.notStarted,
    }))
  }, [data])

  const barSeries = useMemo(() => {
    const series = [
      { key: 'Approved', name: 'Approved', fill: CHART_COLORS.approved },
      { key: 'Submitted', name: 'Submitted', fill: CHART_COLORS.submitted },
      { key: 'InProgress', name: 'In Progress', fill: CHART_COLORS.in_progress },
      { key: 'Revision', name: 'Revision', fill: CHART_COLORS.revision },
      { key: 'Rejected', name: 'Rejected', fill: CHART_COLORS.rejected },
      { key: 'Desnagging', name: 'Desnagging', fill: CHART_COLORS.desnagging },
      { key: 'HandedOver', name: 'Handed Over', fill: CHART_COLORS.handed_over },
      { key: 'NotStarted', name: 'Not Started', fill: CHART_COLORS.not_started },
    ] as const
    return series.filter((s) =>
      barData.some((row) => Number((row as Record<string, number | string>)[s.key] || 0) > 0)
    )
  }, [barData])

  const fewProjects = barData.length <= 2
  const barMaxSize = barData.length <= 1 ? 48 : barData.length <= 3 ? 40 : 28

  const snagDonut = useMemo(
    () => [
      { name: 'Open', value: totals.snagOpen, fill: CHART_COLORS.rejected },
      { name: 'Rectified', value: totals.snagRectified, fill: CHART_COLORS.submitted },
      { name: 'Closed', value: totals.snagClosed, fill: CHART_COLORS.approved },
    ],
    [totals]
  )

  const snagTotal = totals.snagOpen + totals.snagRectified + totals.snagClosed

  const exportCsv = async (type: string) => {
    const projectId = exportProjectId || projects[0]?.id
    if (!projectId) {
      toast.error('No project to export')
      return
    }
    setExporting(true)
    try {
      const { data: csv } = await reportsApi.export(projectId, type)
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${type}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={FileText}
        title="No report data"
        description="Reports will appear once projects have activity."
      />
    )
  }

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Reports</h1>
          <p className="text-[11px] text-ink-400">
            {totals.flats} flats · {totals.engineers} engineer
            {totals.engineers !== 1 ? 's' : ''} · {snagTotal} snag{snagTotal !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className={compactBtn}
          loading={exporting}
          disabled={!projects.length}
          onClick={() => exportCsv('flat')}
        >
          <Download size={14} aria-hidden />
          <span className="sm:hidden">CSV</span>
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          index={0}
          label="Approved"
          value={totals.approved}
          icon={CheckCircle}
          colorClass="text-success-600 bg-success-100"
        />
        <StatCard
          index={1}
          label="Pending"
          value={totals.pending}
          icon={Clock}
          colorClass="text-warning-600 bg-warning-100"
        />
        <StatCard
          index={2}
          label="Revision"
          value={totals.revision}
          icon={AlertTriangle}
          colorClass="text-warning-600 bg-warning-100"
        />
        <StatCard
          index={3}
          label="Open Snags"
          value={totals.snagOpen}
          icon={Wrench}
          colorClass="text-danger-600 bg-danger-100"
        />
      </div>

      {projects.length > 0 && (
        <Card className="border-ink-100 bg-surface p-3 shadow-xs">
          <label className={fieldLabel}>Export project</label>
          <Select
            value={exportProjectId}
            onChange={(e) => setExportProjectId(e.target.value)}
            aria-label="Project for CSV export"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Card>
      )}

      <SegmentedControl
        options={TABS}
        value={activeTab}
        onChange={setActiveTab}
        layoutId="reports-tab"
      />

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            className="space-y-3"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: easeOut }}
          >
            <Card className="overflow-hidden p-3 shadow-xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  Flat status by project
                </h2>
                <span className="text-[10px] tabular text-ink-400">
                  {barData.length} project{barData.length !== 1 ? 's' : ''}
                </span>
              </div>
              {barData.length === 0 ? (
                <p className="py-10 text-center text-[11px] text-ink-400">No project stats yet</p>
              ) : (
                <>
                  <ResponsiveContainer
                    width="100%"
                    height={fewProjects ? Math.max(120, barData.length * 56) : 220}
                  >
                    <BarChart
                      layout={fewProjects ? 'vertical' : 'horizontal'}
                      data={barData}
                      margin={
                        fewProjects
                          ? { top: 4, right: 12, left: 4, bottom: 4 }
                          : { top: 8, right: 8, left: 0, bottom: 4 }
                      }
                      barCategoryGap={
                        fewProjects ? '28%' : barData.length === 1 ? '55%' : '22%'
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E2E8F0"
                        horizontal={!fewProjects}
                        vertical={fewProjects}
                      />
                      {fewProjects ? (
                        <>
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={72}
                            tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                          />
                        </>
                      ) : (
                        <>
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                            width={36}
                          />
                        </>
                      )}
                      <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(0,155,255,0.06)' }} />
                      {barSeries.map((s, i) => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          stackId="a"
                          fill={s.fill}
                          name={s.name}
                          maxBarSize={barMaxSize}
                          isAnimationActive={!reduced}
                          animationDuration={700}
                          radius={
                            i === barSeries.length - 1
                              ? fewProjects
                                ? [0, 4, 4, 0]
                                : [4, 4, 0, 0]
                              : [0, 0, 0, 0]
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  {barSeries.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-ink-50 pt-2">
                      {barSeries.map((s) => (
                        <span
                          key={s.key}
                          className="inline-flex items-center gap-1.5 text-[11px] text-ink-600"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: s.fill }}
                          />
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Card>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.projectStats.map((p, i) => {
                const total = p.totalFlats || 1
                const pct =
                  typeof p.completionPct === 'number'
                    ? Math.round(p.completionPct)
                    : Math.round(((p.approved + p.handedOver) / total) * 100)
                const segments = [
                  { key: 'approved', value: p.approved, fill: CHART_COLORS.approved },
                  { key: 'submitted', value: p.submitted, fill: CHART_COLORS.submitted },
                  { key: 'inProgress', value: p.inProgress, fill: CHART_COLORS.in_progress },
                  { key: 'revision', value: p.revisionRequired, fill: CHART_COLORS.revision },
                  { key: 'rejected', value: p.rejected, fill: CHART_COLORS.rejected },
                  { key: 'desnagging', value: p.desnagging, fill: CHART_COLORS.desnagging },
                  { key: 'handedOver', value: p.handedOver, fill: CHART_COLORS.handed_over },
                  { key: 'notStarted', value: p.notStarted, fill: CHART_COLORS.not_started },
                ].filter((s) => s.value > 0)

                return (
                  <motion.div
                    key={p.projectId ?? p.projectName}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={stagger(Math.min(i, 12))}
                  >
                    <Card className="p-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink-950">
                          {p.projectName}
                        </p>
                        <span className="shrink-0 text-[11px] font-bold tabular text-brand-600">
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-ink-100">
                        {segments.map((s) => (
                          <motion.div
                            key={s.key}
                            className="h-full"
                            style={{ background: s.fill }}
                            initial={reduced ? false : { width: 0 }}
                            animate={{ width: `${(s.value / total) * 100}%` }}
                            transition={{
                              duration: 0.5,
                              ease: easeOut,
                              delay: Math.min(i, 8) * 0.04,
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-ink-500">
                        {p.approved > 0 && (
                          <span>
                            <span className="font-semibold text-success-600">{p.approved}</span>{' '}
                            approved
                          </span>
                        )}
                        {p.inProgress > 0 && (
                          <span>
                            <span className="font-semibold text-brand-600">{p.inProgress}</span>{' '}
                            in progress
                          </span>
                        )}
                        {p.submitted > 0 && (
                          <span>
                            <span className="font-semibold text-warning-600">{p.submitted}</span>{' '}
                            submitted
                          </span>
                        )}
                        {p.revisionRequired > 0 && (
                          <span>
                            <span className="font-semibold text-warning-700">
                              {p.revisionRequired}
                            </span>{' '}
                            revision
                          </span>
                        )}
                        {p.notStarted > 0 && (
                          <span>
                            <span className="font-semibold text-ink-500">{p.notStarted}</span>{' '}
                            not started
                          </span>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'engineers' && (
          <motion.div
            key="engineers"
            className="space-y-1.5"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: easeOut }}
          >
            {data.engineerLeaderboard.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No engineer stats"
                description="Leaderboard fills as inspections are assigned."
                className="py-10"
              />
            ) : (
              <>
                <div className="hidden items-center gap-3 rounded-md border border-ink-100/80 bg-ink-50/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400 md:grid md:grid-cols-[1.4fr_70px_70px_70px]">
                  <span>Engineer</span>
                  <span className="text-right">Assigned</span>
                  <span className="text-right">Submitted</span>
                  <span className="text-right">Approved</span>
                </div>
                {data.engineerLeaderboard.map((e, i) => {
                  const rate =
                    e.assigned > 0 ? Math.round((e.approved / e.assigned) * 100) : 0
                  return (
                    <motion.div
                      key={e.engineerId}
                      layout={!reduced}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={stagger(Math.min(i, 12))}
                    >
                      <Card className="overflow-hidden p-0 shadow-xs">
                        {/* Mobile */}
                        <div className="flex items-center gap-2.5 p-3 md:hidden">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-600">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-950">{e.name}</p>
                            <p className="mt-0.5 text-[11px] text-ink-400">
                              {e.assigned} assigned · {e.submitted} submitted ·{' '}
                              <span className="font-semibold text-success-600">{e.approved}</span>{' '}
                              approved
                            </p>
                            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-100">
                              <div
                                className="h-full rounded-full bg-brand-500"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-bold tabular text-ink-500">
                            {rate}%
                          </span>
                        </div>
                        {/* Desktop */}
                        <div className="hidden items-center gap-3 px-3 py-2.5 md:grid md:grid-cols-[1.4fr_70px_70px_70px]">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-600">
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-950">{e.name}</p>
                              <p className="text-[10px] text-ink-400">{rate}% approval rate</p>
                            </div>
                          </div>
                          <span className="text-right text-sm tabular text-ink-600">{e.assigned}</span>
                          <span className="text-right text-sm tabular text-ink-600">{e.submitted}</span>
                          <span className="text-right text-sm font-semibold tabular text-success-600">
                            {e.approved}
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'snags' && (
          <motion.div
            key="snags"
            className="space-y-3"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: easeOut }}
          >
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                index={0}
                label="Open"
                value={totals.snagOpen}
                icon={AlertTriangle}
                colorClass="text-danger-600 bg-danger-100"
              />
              <StatCard
                index={1}
                label="Rectified"
                value={totals.snagRectified}
                icon={Wrench}
                colorClass="text-warning-600 bg-warning-100"
              />
              <StatCard
                index={2}
                label="Closed"
                value={totals.snagClosed}
                icon={CheckCircle}
                colorClass="text-success-600 bg-success-100"
              />
            </div>

            <Card className="p-3 shadow-xs">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                Distribution
              </p>
              <StatusDonut
                data={snagDonut}
                centerLabel="Total"
                centerValue={snagTotal}
                height={160}
              />
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                {snagDonut.map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1.5 text-[11px] text-ink-600"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                    {s.name}
                    <span className="font-bold tabular text-ink-800">{s.value}</span>
                  </span>
                ))}
              </div>
            </Card>

            <div className="space-y-1.5">
              {[
                {
                  label: 'Open',
                  value: totals.snagOpen,
                  color: 'bg-danger-500',
                  text: 'text-danger-600',
                },
                {
                  label: 'Rectified',
                  value: totals.snagRectified,
                  color: 'bg-warning-500',
                  text: 'text-warning-600',
                },
                {
                  label: 'Closed',
                  value: totals.snagClosed,
                  color: 'bg-success-500',
                  text: 'text-success-600',
                },
              ].map((row, i) => {
                const pct = snagTotal > 0 ? Math.round((row.value / snagTotal) * 100) : 0
                return (
                  <motion.div
                    key={row.label}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={stagger(i)}
                  >
                    <Card className="p-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink-700">{row.label}</span>
                        <span className={cn('text-sm font-bold tabular', row.text)}>
                          {row.value}
                          <span className="ml-1 text-[10px] font-semibold text-ink-400">
                            {pct}%
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <motion.div
                          className={cn('h-full rounded-full', row.color)}
                          initial={reduced ? false : { width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: easeOut, delay: i * 0.06 }}
                        />
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
