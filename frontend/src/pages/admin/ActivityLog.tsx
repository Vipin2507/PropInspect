import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay } from 'date-fns'
import {
  Activity, ClipboardCheck, Wrench, Search, Users, User, Eye,
} from 'lucide-react'
import { useActivity } from '../../hooks/useActivity'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'
import type { ActivityEntry } from '../../types'

type RoleKey = '' | 'engineer' | 'qa'
type TypeKey = '' | 'inspection_update' | 'review'

const easeOut = [0.22, 1, 0.36, 1] as const
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'
const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'

const ROLE_OPTIONS: { value: RoleKey; label: string }[] = [
  { value: '', label: 'All Roles' },
  { value: 'engineer', label: 'Engineers' },
  { value: 'qa', label: 'Checkers / QA' },
]

const TYPE_OPTIONS: { value: TypeKey; label: string }[] = [
  { value: '', label: 'All Activity' },
  { value: 'inspection_update', label: 'Inspection Updates' },
  { value: 'review', label: 'Reviews' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'text-ink-600 bg-ink-100' },
  submitted: { label: 'Submitted', color: 'text-brand-600 bg-brand-100' },
  approved: { label: 'Approved', color: 'text-success-600 bg-success-100' },
  rejected: { label: 'Rejected', color: 'text-danger-600 bg-danger-100' },
  revision_required: { label: 'Revision', color: 'text-warning-600 bg-warning-100' },
}

function statusBadge(status: string) {
  const s = STATUS_LABELS[status] ?? { label: status, color: 'text-ink-500 bg-ink-100' }
  return (
    <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', s.color)}>
      {s.label}
    </span>
  )
}

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'dd MMM yyyy')
}

export default function ActivityLog() {
  const { activity, loading } = useActivity(200)
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const [roleFilter, setRoleFilter] = useState<RoleKey>('')
  const [typeFilter, setTypeFilter] = useState<TypeKey>('')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const counts = useMemo(() => {
    let engineers = 0
    let checkers = 0
    let inspections = 0
    let reviews = 0
    for (const a of activity) {
      if (a.userRole === 'engineer') engineers++
      if (a.userRole === 'qa') checkers++
      if (a.activityType === 'inspection_update') inspections++
      if (a.activityType === 'review') reviews++
    }
    return { total: activity.length, engineers, checkers, inspections, reviews }
  }, [activity])

  const filtered = useMemo(() => {
    return activity.filter((a) => {
      if (roleFilter && a.userRole !== roleFilter) return false
      if (typeFilter && a.activityType !== typeFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = [
          a.userName,
          a.flatNumber,
          a.towerName,
          a.projectName,
          a.inspectionStatus,
          a.comments,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [activity, roleFilter, typeFilter, search])

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>()
    for (const entry of filtered) {
      const d = startOfDay(new Date(entry.activityAt))
      const key = d.toISOString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: dayLabel(new Date(key)),
      items,
    }))
  }, [filtered])

  const activeFilterCount = [roleFilter, typeFilter, search].filter(Boolean).length

  const selectRole = (key: RoleKey) => {
    setRoleFilter((prev) => (prev === key ? '' : key))
  }

  const selectType = (key: TypeKey) => {
    setTypeFilter((prev) => (prev === key ? '' : key))
  }

  let itemIndex = 0

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Activity</h1>
          <p className="text-[11px] text-ink-400">
            {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
            {activeFilterCount > 0
              ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant={filtersOpen ? 'primary' : 'outline'}
          className={compactBtn}
          onClick={() => setFiltersOpen((p) => !p)}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand-600">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <StatCard
          index={0}
          label="Total"
          value={counts.total}
          icon={Activity}
          selected={!roleFilter && !typeFilter}
          onClick={() => {
            setRoleFilter('')
            setTypeFilter('')
          }}
        />
        <StatCard
          index={1}
          label="Engineers"
          value={counts.engineers}
          icon={User}
          colorClass="text-warning-600 bg-warning-100"
          selected={roleFilter === 'engineer'}
          onClick={() => selectRole('engineer')}
        />
        <StatCard
          index={2}
          label="Checkers"
          value={counts.checkers}
          icon={Users}
          colorClass="text-brand-600 bg-brand-100"
          selected={roleFilter === 'qa'}
          onClick={() => selectRole('qa')}
        />
        <StatCard
          index={3}
          label="Inspections"
          value={counts.inspections}
          icon={Wrench}
          colorClass="text-ink-600 bg-ink-100"
          selected={typeFilter === 'inspection_update'}
          onClick={() => selectType('inspection_update')}
        />
        <StatCard
          index={4}
          label="Reviews"
          value={counts.reviews}
          icon={ClipboardCheck}
          colorClass="text-brand-600 bg-brand-100"
          selected={typeFilter === 'review'}
          onClick={() => selectType('review')}
          className="col-span-3 sm:col-span-1"
        />
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            key="filters"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: easeOut }}
            className="overflow-hidden"
          >
            <Card className="border-ink-100 bg-surface p-3 shadow-xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Filters
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRoleFilter('')
                      setTypeFilter('')
                      setSearch('')
                    }}
                    className="text-[11px] font-semibold text-danger-600 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel}>Role</label>
                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as RoleKey)}
                    aria-label="Filter by role"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={fieldLabel}>Type</label>
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TypeKey)}
                    aria-label="Filter by activity type"
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          aria-hidden
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user, flat, project…"
          className="w-full min-h-[40px] rounded-md border border-ink-200 bg-surface py-2 pl-9 pr-3 text-sm text-ink-950 outline-none transition-all duration-fast focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          style={{ fontSize: '16px' }}
        />
      </div>

      {loading && activity.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="No activity found"
          description="Try adjusting your filters."
          className="py-10"
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${roleFilter}-${typeFilter}-${search}`}
            className="space-y-3"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            {grouped.map((group) => (
              <div key={group.key} className="space-y-1.5">
                <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  {group.label}
                </p>
                {group.items.map((entry) => {
                  const i = itemIndex++
                  const isReview = entry.activityType === 'review'
                  const relative = formatDistanceToNow(new Date(entry.activityAt), {
                    addSuffix: true,
                  })
                  const absolute = format(new Date(entry.activityAt), 'dd MMM, h:mm a')

                  return (
                    <motion.div
                      key={`${entry.inspectionId}-${entry.activityAt}-${entry.userId}-${i}`}
                      layout={!reduced}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={stagger(Math.min(i, 12))}
                    >
                      <Card className="overflow-hidden p-0 shadow-xs">
                        <div className="flex items-start gap-2.5 p-3">
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                              isReview
                                ? 'bg-brand-100 text-brand-600'
                                : 'bg-warning-100 text-warning-600'
                            )}
                          >
                            {isReview ? (
                              <ClipboardCheck size={16} aria-hidden />
                            ) : (
                              <Wrench size={16} aria-hidden />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink-950">
                                  {entry.userName}
                                </p>
                                <span
                                  className={cn(
                                    'mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                                    entry.userRole === 'qa'
                                      ? 'bg-brand-100 text-brand-600'
                                      : 'bg-warning-100 text-warning-700'
                                  )}
                                >
                                  {entry.userRole === 'qa' ? 'Checker' : 'Engineer'}
                                </span>
                              </div>
                              {statusBadge(entry.inspectionStatus)}
                            </div>

                            <p className="mt-1.5 truncate text-[11px] text-ink-500">
                              <span className="font-semibold text-ink-700">
                                {entry.flatNumber}
                              </span>
                              {' · '}
                              {entry.towerName}
                              {' · '}
                              {entry.projectName}
                            </p>

                            {entry.comments && (
                              <p className="mt-1.5 line-clamp-2 rounded-md bg-ink-50 px-2 py-1.5 text-[11px] italic text-ink-600">
                                “{entry.comments}”
                              </p>
                            )}

                            <p className="mt-1.5 text-[10px] text-ink-400">
                              {relative}
                              <span className="text-ink-300"> · </span>
                              {absolute}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
