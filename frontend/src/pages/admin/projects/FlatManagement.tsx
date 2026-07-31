import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { flatsApi, usersApi, assignmentsApi, towersApi } from '../../../utils/api'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Modal } from '../../../components/ui/Modal'
import { StatusBadge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { StatCard } from '../../../components/ui/StatCard'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Spinner } from '../../../components/ui/Spinner'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ROUTES } from '../../../constants/routes'
import { useMotionSafe } from '../../../hooks/useMotionSafe'
import type { Flat, User, Tower } from '../../../types'
import {
  ArrowLeft, Pencil, X, CheckSquare, Square,
  Users, Minus, UserCheck, UserX, Home, UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'

type AssignFilter = 'all' | 'assigned' | 'unassigned'

export default function FlatManagement() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { fadeUp, reduced, stagger } = useMotionSafe()

  const [flats, setFlats] = useState<Flat[]>([])
  const [engineers, setEngineers] = useState<User[]>([])
  const [qas, setQas] = useState<User[]>([])
  const [towers, setTowers] = useState<Tower[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkEngineerId, setBulkEngineerId] = useState('')
  const [bulkQaId, setBulkQaId] = useState('')

  const [filterTower, setFilterTower] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssignment, setFilterAssignment] = useState<AssignFilter>('all')

  const [editOpen, setEditOpen] = useState(false)
  const [editFlat, setEditFlat] = useState<Flat | null>(null)
  const [editEngineerId, setEditEngineerId] = useState('')
  const [editQaId, setEditQaId] = useState('')

  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeFlat, setRemoveFlat] = useState<Flat | null>(null)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignFlat, setAssignFlat] = useState<Flat | null>(null)
  const [assignEngineerId, setAssignEngineerId] = useState('')
  const [assignQaId, setAssignQaId] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const { getDb } = await import('../../../utils/db')
      const db = await getDb()

      if (projectId) {
        const allCached = (await db.getAll('flats')) as unknown as Flat[]
        const projectFlats = allCached.filter((f) => f.projectId === projectId)
        if (projectFlats.length) setFlats(projectFlats)

        const cachedTowers = (await db.getAllFromIndex(
          'towers',
          'by-project',
          projectId
        )) as unknown as Tower[]
        if (cachedTowers.length) setTowers(cachedTowers)
      }
      const cachedUsers = (await db.getAll('users')) as unknown as User[]
      if (cachedUsers.length) {
        setEngineers(cachedUsers.filter((u) => u.role === 'engineer'))
        setQas(cachedUsers.filter((u) => u.role === 'qa'))
      }

      await Promise.allSettled([
        projectId
          ? flatsApi.byProject(projectId).then(({ data }) => {
              setFlats(data)
              const tx = db.transaction('flats', 'readwrite')
              data.forEach((f) => tx.store.put(f as unknown as Record<string, unknown>))
              return tx.done
            })
          : Promise.resolve(),
        usersApi.list('engineer').then(({ data }) => {
          setEngineers(data)
          const tx = db.transaction('users', 'readwrite')
          data.forEach((u) => tx.store.put(u as unknown as Record<string, unknown>))
          return tx.done
        }),
        usersApi.list('qa').then(({ data }) => {
          setQas(data)
          const tx = db.transaction('users', 'readwrite')
          data.forEach((u) => tx.store.put(u as unknown as Record<string, unknown>))
          return tx.done
        }),
        projectId
          ? towersApi.list(projectId).then(({ data }) => {
              setTowers(data)
              const tx = db.transaction('towers', 'readwrite')
              data.forEach((t) => tx.store.put(t as unknown as Record<string, unknown>))
              return tx.done
            })
          : Promise.resolve(),
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  const filteredFlats = useMemo(() => {
    return flats.filter((f) => {
      if (filterTower && f.towerId !== filterTower) return false
      if (filterStatus && f.status !== filterStatus) return false
      if (filterAssignment === 'assigned' && !f.assignment) return false
      if (filterAssignment === 'unassigned' && f.assignment) return false
      return true
    })
  }, [flats, filterTower, filterStatus, filterAssignment])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.size === filteredFlats.length
        ? new Set()
        : new Set(filteredFlats.map((f) => f.id))
    )
  }

  const clearSelection = () => setSelectedIds(new Set())

  const selectedCount = selectedIds.size
  const allSelected = filteredFlats.length > 0 && selectedIds.size === filteredFlats.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredFlats.length

  const statCounts = useMemo(
    () => ({
      total: flats.length,
      assigned: flats.filter((f) => f.assignment).length,
      unassigned: flats.filter((f) => !f.assignment).length,
    }),
    [flats]
  )

  const selectStat = (key: AssignFilter | 'total') => {
    if (key === 'total') setFilterAssignment('all')
    else setFilterAssignment((prev) => (prev === key ? 'all' : key))
  }

  const bulkAssign = async () => {
    if (!bulkEngineerId || !bulkQaId) {
      toast.error('Select both Engineer and QA')
      return
    }
    try {
      const { data } = await assignmentsApi.bulkCreate({
        flatIds: Array.from(selectedIds),
        engineerId: bulkEngineerId,
        qaId: bulkQaId,
      })
      if (data.created.length)
        toast.success(`Assigned ${data.created.length} flat${data.created.length > 1 ? 's' : ''}`)
      if (data.skipped.length)
        toast(`${data.skipped.length} skipped (already assigned)`, { icon: 'ℹ️' })
      clearSelection()
      setBulkEngineerId('')
      setBulkQaId('')
      loadData()
    } catch {
      toast.error('Failed to assign flats')
    }
  }

  const openEditAssignment = (f: Flat) => {
    setEditFlat(f)
    setEditEngineerId(f.assignment?.engineerId || '')
    setEditQaId(f.assignment?.qaId || '')
    setEditOpen(true)
  }

  const saveEditAssignment = async () => {
    if (!editFlat?.assignment) return
    await assignmentsApi.update(editFlat.assignment.id, {
      engineerId: editEngineerId,
      qaId: editQaId,
    })
    toast.success('Assignment updated')
    setEditOpen(false)
    loadData()
  }

  const confirmRemoveAssignment = async () => {
    if (!removeFlat?.assignment) return
    await assignmentsApi.delete(removeFlat.assignment.id)
    toast.success('Assignment removed')
    setRemoveOpen(false)
    loadData()
  }

  const openQuickAssign = (f: Flat) => {
    setAssignFlat(f)
    setAssignEngineerId('')
    setAssignQaId('')
    setAssignOpen(true)
  }

  const saveQuickAssign = async () => {
    if (!assignFlat || !assignEngineerId || !assignQaId) {
      toast.error('Select both Engineer and QA')
      return
    }
    await assignmentsApi.create({
      flatId: assignFlat.id,
      engineerId: assignEngineerId,
      qaId: assignQaId,
    })
    toast.success(`${assignFlat.flatNumber} assigned`)
    setAssignOpen(false)
    loadData()
  }

  if (loading && flats.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <button
        type="button"
        onClick={() => navigate(ROUTES.ADMIN_PROJECT(projectId!))}
        className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors duration-fast hover:text-brand-600 touch-manipulation"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Project
      </button>

      <div className="min-w-0">
        <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Flat Management</h1>
        <p className="text-[11px] text-ink-400">
          Showing {filteredFlats.length} of {flats.length} flats
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          index={0}
          label="Total"
          value={statCounts.total}
          icon={Home}
          selected={filterAssignment === 'all' && !filterTower && !filterStatus}
          onClick={() => selectStat('total')}
        />
        <StatCard
          index={1}
          label="Assigned"
          value={statCounts.assigned}
          icon={UserCheck}
          colorClass="text-success-600 bg-success-100"
          selected={filterAssignment === 'assigned'}
          onClick={() => selectStat('assigned')}
        />
        <StatCard
          index={2}
          label="Unassigned"
          value={statCounts.unassigned}
          icon={UserPlus}
          colorClass="text-warning-600 bg-warning-100"
          selected={filterAssignment === 'unassigned'}
          onClick={() => selectStat('unassigned')}
        />
      </div>

      <Card className="border-ink-100 bg-surface p-3 shadow-xs">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Filters</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select value={filterTower} onChange={(e) => setFilterTower(e.target.value)}>
            <option value="">All Towers</option>
            {towers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revision_required">Revision Required</option>
            <option value="desnagging">Desnagging</option>
            <option value="handed_over">Handed Over</option>
          </Select>
          <Select
            value={filterAssignment}
            onChange={(e) => setFilterAssignment(e.target.value as AssignFilter)}
          >
            <option value="all">All Assignments</option>
            <option value="assigned">Assigned Only</option>
            <option value="unassigned">Unassigned Only</option>
          </Select>
        </div>
      </Card>

      <div className="flex items-center gap-2 rounded-md border border-ink-100/80 bg-surface px-3 py-2 shadow-xs">
        <button
          type="button"
          onClick={toggleSelectAll}
          className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-md text-ink-500 hover:bg-ink-50"
          aria-label="Select all"
        >
          {allSelected ? (
            <CheckSquare size={18} className="text-brand-600" />
          ) : someSelected ? (
            <Minus size={18} className="text-brand-600" />
          ) : (
            <Square size={18} className="text-ink-300" />
          )}
        </button>
        <span className="text-xs font-semibold text-ink-600">
          {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
        </span>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto text-[11px] font-semibold text-brand-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {selectedCount > 0 && (
          <motion.div
            key="bulk"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <Card className="space-y-2 border-brand-200 bg-brand-50/40 p-3 shadow-xs">
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-brand-600" aria-hidden="true" />
                <span className="text-xs font-semibold text-brand-700">
                  Assign {selectedCount} flat{selectedCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select value={bulkEngineerId} onChange={(e) => setBulkEngineerId(e.target.value)}>
                  <option value="">Select Engineer</option>
                  {engineers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
                <Select value={bulkQaId} onChange={(e) => setBulkQaId(e.target.value)}>
                  <option value="">Select QA</option>
                  {qas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button size="sm" className={cn(compactBtn, 'w-full sm:w-auto')} onClick={bulkAssign}>
                Assign Selected
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredFlats.length === 0 ? (
        <EmptyState
          title="No flats found"
          description="Try adjusting the filters above."
          className="py-10"
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {filteredFlats.map((f, i) => {
            const isSelected = selectedIds.has(f.id)
            const hasAssignment = !!f.assignment

            return (
              <motion.div
                key={f.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(Math.min(i, 12))}
              >
                <Card
                  className={cn(
                    'overflow-hidden shadow-xs transition-all duration-fast',
                    isSelected && 'border-brand-400 ring-2 ring-brand-100',
                    !hasAssignment && !isSelected && 'border-warning-200/80 bg-warning-50/20'
                  )}
                >
                  <div className="flex items-start gap-2 p-3 pb-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(f.id)}
                      className="mt-0.5 flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-md hover:bg-ink-50"
                      aria-label={isSelected ? 'Deselect flat' : 'Select flat'}
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-brand-600" />
                      ) : (
                        <Square size={18} className="text-ink-300" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-ink-950">{f.flatNumber}</span>
                        <StatusBadge status={f.status} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-ink-400">
                        {f.towerName || '—'} · {f.floorLabel || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-ink-100 px-3 py-2">
                    <div>
                      <p className={fieldLabel}>Engineer</p>
                      {f.assignment?.engineerName ? (
                        <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-700">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success-600" />
                          {f.assignment.engineerName}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 text-xs text-ink-400">
                          <UserX size={11} aria-hidden="true" /> Unassigned
                        </p>
                      )}
                    </div>
                    <div>
                      <p className={fieldLabel}>QA</p>
                      {f.assignment?.qaName ? (
                        <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-700">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                          {f.assignment.qaName}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 text-xs text-ink-400">
                          <UserX size={11} aria-hidden="true" /> Unassigned
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1.5 border-t border-ink-100 px-3 py-2">
                    {hasAssignment ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(compactBtn, 'flex-1')}
                          onClick={() => openEditAssignment(f)}
                        >
                          <Pencil size={13} aria-hidden="true" /> Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className={cn(compactBtn, 'flex-1')}
                          onClick={() => {
                            setRemoveFlat(f)
                            setRemoveOpen(true)
                          }}
                        >
                          <X size={13} aria-hidden="true" /> Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className={cn(compactBtn, 'w-full')}
                        onClick={() => openQuickAssign(f)}
                      >
                        <UserCheck size={13} aria-hidden="true" /> Assign
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal open={editOpen} onOpenChange={setEditOpen} title={`Edit — ${editFlat?.flatNumber}`}>
        <div className="space-y-3">
          <div>
            <label className={fieldLabel}>Engineer</label>
            <Select value={editEngineerId} onChange={(e) => setEditEngineerId(e.target.value)}>
              <option value="">Select Engineer</option>
              {engineers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className={fieldLabel}>QA Reviewer</label>
            <Select value={editQaId} onChange={(e) => setEditQaId(e.target.value)}>
              <option value="">Select QA</option>
              {qas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={saveEditAssignment} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={assignOpen} onOpenChange={setAssignOpen} title={`Assign — ${assignFlat?.flatNumber}`}>
        <div className="space-y-3">
          <div>
            <label className={fieldLabel}>Engineer</label>
            <Select value={assignEngineerId} onChange={(e) => setAssignEngineerId(e.target.value)}>
              <option value="">Select Engineer</option>
              {engineers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className={fieldLabel}>QA Reviewer</label>
            <Select value={assignQaId} onChange={(e) => setAssignQaId(e.target.value)}>
              <option value="">Select QA</option>
              {qas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setAssignOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={saveQuickAssign}
              className="flex-1"
              disabled={!assignEngineerId || !assignQaId}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove Assignment"
        message={`Remove engineer and QA from flat "${removeFlat?.flatNumber}"? It will become unassigned.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmRemoveAssignment}
      />
    </motion.div>
  )
}
