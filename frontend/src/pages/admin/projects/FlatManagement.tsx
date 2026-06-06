import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { flatsApi, usersApi, assignmentsApi, towersApi } from '../../../utils/api'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Modal } from '../../../components/ui/Modal'
import { Badge } from '../../../components/ui/Badge'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Spinner } from '../../../components/ui/Spinner'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ROUTES } from '../../../constants/routes'
import type { Flat, User, Tower } from '../../../types'
import {
  ArrowLeft, Pencil, X, CheckSquare, Square,
  Users, Minus, UserCheck, UserX,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

export default function FlatManagement() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()

  const [flats, setFlats]         = useState<Flat[]>([])
  const [engineers, setEngineers] = useState<User[]>([])
  const [qas, setQas]             = useState<User[]>([])
  const [towers, setTowers]       = useState<Tower[]>([])
  const [loading, setLoading]     = useState(true)

  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [bulkEngineerId, setBulkEngineerId] = useState('')
  const [bulkQaId, setBulkQaId]         = useState('')

  const [filterTower, setFilterTower]           = useState('')
  const [filterStatus, setFilterStatus]         = useState('')
  const [filterAssignment, setFilterAssignment] = useState<'all' | 'assigned' | 'unassigned'>('all')

  const [editOpen, setEditOpen]         = useState(false)
  const [editFlat, setEditFlat]         = useState<Flat | null>(null)
  const [editEngineerId, setEditEngineerId] = useState('')
  const [editQaId, setEditQaId]         = useState('')

  const [removeOpen, setRemoveOpen]   = useState(false)
  const [removeFlat, setRemoveFlat]   = useState<Flat | null>(null)

  // Quick-assign a single unassigned flat
  const [assignOpen, setAssignOpen]   = useState(false)
  const [assignFlat, setAssignFlat]   = useState<Flat | null>(null)
  const [assignEngineerId, setAssignEngineerId] = useState('')
  const [assignQaId, setAssignQaId]   = useState('')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      projectId ? flatsApi.byProject(projectId).then(({ data }) => setFlats(data)) : Promise.resolve(),
      usersApi.list('engineer').then(({ data }) => setEngineers(data)),
      usersApi.list('qa').then(({ data }) => setQas(data)),
      projectId ? towersApi.list(projectId).then(({ data }) => setTowers(data)) : Promise.resolve(),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [projectId])

  const filteredFlats = useMemo(() => {
    return flats.filter((f) => {
      if (filterTower      && f.towerId !== filterTower)    return false
      if (filterStatus     && f.status  !== filterStatus)   return false
      if (filterAssignment === 'assigned'   && !f.assignment) return false
      if (filterAssignment === 'unassigned' &&  f.assignment) return false
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
  const allSelected   = filteredFlats.length > 0 && selectedIds.size === filteredFlats.length
  const someSelected  = selectedIds.size > 0 && selectedIds.size < filteredFlats.length

  const statCounts = useMemo(() => ({
    total:      flats.length,
    assigned:   flats.filter((f) =>  f.assignment).length,
    unassigned: flats.filter((f) => !f.assignment).length,
  }), [flats])

  const bulkAssign = async () => {
    if (!bulkEngineerId || !bulkQaId) { toast.error('Select both Engineer and QA'); return }
    try {
      const { data } = await assignmentsApi.bulkCreate({
        flatIds: Array.from(selectedIds),
        engineerId: bulkEngineerId,
        qaId: bulkQaId,
      })
      if (data.created.length) toast.success(`Assigned ${data.created.length} flat${data.created.length > 1 ? 's' : ''}`)
      if (data.skipped.length) toast(`${data.skipped.length} skipped (already assigned)`, { icon: 'ℹ️' })
      clearSelection(); setBulkEngineerId(''); setBulkQaId('')
      loadData()
    } catch { toast.error('Failed to assign flats') }
  }

  const openEditAssignment = (f: Flat) => {
    setEditFlat(f)
    setEditEngineerId(f.assignment?.engineerId || '')
    setEditQaId(f.assignment?.qaId || '')
    setEditOpen(true)
  }

  const saveEditAssignment = async () => {
    if (!editFlat?.assignment) return
    await assignmentsApi.update(editFlat.assignment.id, { engineerId: editEngineerId, qaId: editQaId })
    toast.success('Assignment updated')
    setEditOpen(false); loadData()
  }

  const confirmRemoveAssignment = async () => {
    if (!removeFlat?.assignment) return
    await assignmentsApi.delete(removeFlat.assignment.id)
    toast.success('Assignment removed')
    setRemoveOpen(false); loadData()
  }

  const openQuickAssign = (f: Flat) => {
    setAssignFlat(f); setAssignEngineerId(''); setAssignQaId(''); setAssignOpen(true)
  }

  const saveQuickAssign = async () => {
    if (!assignFlat || !assignEngineerId || !assignQaId) {
      toast.error('Select both Engineer and QA'); return
    }
    await assignmentsApi.create({ flatId: assignFlat.id, engineerId: assignEngineerId, qaId: assignQaId })
    toast.success(`${assignFlat.flatNumber} assigned`)
    setAssignOpen(false); loadData()
  }

  if (loading) return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header */}
      <button
        onClick={() => navigate(ROUTES.ADMIN_PROJECT(projectId!))}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
      >
        <ArrowLeft size={18} aria-hidden="true" /> Back to Project
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Flat Management</h1>
        <p className="text-sm text-slate-500">Assign engineers and QA reviewers to flats</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{statCounts.total}</p>
          <p className="text-xs text-slate-500">Total Flats</p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-700">{statCounts.assigned}</p>
          <p className="text-xs text-green-600">Assigned</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-700">{statCounts.unassigned}</p>
          <p className="text-xs text-amber-600">Unassigned</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3">
        <Select value={filterTower} onChange={(e) => setFilterTower(e.target.value)}>
          <option value="">All Towers</option>
          {towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
        </Select>
        <Select
          value={filterAssignment}
          onChange={(e) => setFilterAssignment(e.target.value as 'all' | 'assigned' | 'unassigned')}
          className="col-span-2 md:w-auto"
        >
          <option value="all">All Assignments</option>
          <option value="assigned">Assigned Only</option>
          <option value="unassigned">Unassigned Only</option>
        </Select>
      </div>

      <p className="text-sm text-slate-500">
        Showing {filteredFlats.length} of {flats.length} flats
      </p>

      {/* Select-all row */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={toggleSelectAll}
          className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center active:bg-slate-50"
          aria-label="Select all"
        >
          {allSelected
            ? <CheckSquare size={20} className="text-primary" />
            : someSelected
            ? <Minus size={20} className="text-primary" />
            : <Square size={20} className="text-slate-400" />}
        </button>
        <span className="text-sm font-medium text-slate-600">
          {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
        </span>
        {selectedCount > 0 && (
          <button
            onClick={clearSelection}
            className="ml-auto text-xs font-medium text-primary active:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Bulk assign toolbar (shown when items selected) */}
      {selectedCount > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-primary">
              Assign {selectedCount} flat{selectedCount !== 1 ? 's' : ''}
            </span>
          </div>
          <Select value={bulkEngineerId} onChange={(e) => setBulkEngineerId(e.target.value)}>
            <option value="">Select Engineer</option>
            {engineers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Select value={bulkQaId} onChange={(e) => setBulkQaId(e.target.value)}>
            <option value="">Select QA</option>
            {qas.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Button onClick={bulkAssign} className="w-full">
            Assign Selected Flats
          </Button>
        </div>
      )}

      {/* Flat card list — mobile-first, no horizontal scroll */}
      {filteredFlats.length === 0 ? (
        <EmptyState title="No flats found" description="Try adjusting the filters above." />
      ) : (
        <div className="space-y-2">
          {filteredFlats.map((f) => {
            const isSelected    = selectedIds.has(f.id)
            const hasAssignment = !!f.assignment

            return (
              <div
                key={f.id}
                className={cn(
                  'rounded-2xl border bg-white shadow-sm transition-colors',
                  isSelected ? 'border-primary bg-primary/5' : 'border-slate-200',
                  !hasAssignment && !isSelected && 'border-amber-200 bg-amber-50/30'
                )}
              >
                {/* Top row: checkbox + flat info + badge */}
                <div className="flex items-start gap-3 p-4 pb-3">
                  <button
                    type="button"
                    onClick={() => toggleSelect(f.id)}
                    className="mt-0.5 flex min-h-[36px] min-w-[36px] touch-manipulation items-center justify-center rounded-lg active:bg-slate-100"
                    aria-label={isSelected ? 'Deselect flat' : 'Select flat'}
                  >
                    {isSelected
                      ? <CheckSquare size={20} className="text-primary" />
                      : <Square size={20} className="text-slate-400" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{f.flatNumber}</span>
                      <Badge status={f.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {f.towerName || '—'} · {f.floorLabel || '—'}
                    </p>
                  </div>
                </div>

                {/* Assignment info */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Engineer
                    </p>
                    {f.assignment?.engineerName ? (
                      <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-700">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                        <span className="truncate">{f.assignment.engineerName}</span>
                      </p>
                    ) : (
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-400">
                        <UserX size={12} aria-hidden="true" /> Unassigned
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      QA Reviewer
                    </p>
                    {f.assignment?.qaName ? (
                      <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-700">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        <span className="truncate">{f.assignment.qaName}</span>
                      </p>
                    ) : (
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-400">
                        <UserX size={12} aria-hidden="true" /> Unassigned
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 border-t border-slate-100 px-4 py-2.5">
                  {hasAssignment ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditAssignment(f)}
                      >
                        <Pencil size={14} aria-hidden="true" /> Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setRemoveFlat(f); setRemoveOpen(true) }}
                      >
                        <X size={14} aria-hidden="true" /> Remove
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => openQuickAssign(f)}
                    >
                      <UserCheck size={14} aria-hidden="true" /> Assign
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Assignment Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title={`Edit — ${editFlat?.flatNumber}`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Engineer</label>
            <Select value={editEngineerId} onChange={(e) => setEditEngineerId(e.target.value)}>
              <option value="">Select Engineer</option>
              {engineers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">QA Reviewer</label>
            <Select value={editQaId} onChange={(e) => setEditQaId(e.target.value)}>
              <option value="">Select QA</option>
              {qas.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveEditAssignment} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Quick Assign Modal (for unassigned flats) */}
      <Modal open={assignOpen} onOpenChange={setAssignOpen} title={`Assign — ${assignFlat?.flatNumber}`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Engineer</label>
            <Select value={assignEngineerId} onChange={(e) => setAssignEngineerId(e.target.value)}>
              <option value="">Select Engineer</option>
              {engineers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">QA Reviewer</label>
            <Select value={assignQaId} onChange={(e) => setAssignQaId(e.target.value)}>
              <option value="">Select QA</option>
              {qas.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setAssignOpen(false)} className="flex-1">Cancel</Button>
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

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove Assignment"
        message={`Remove engineer and QA from flat "${removeFlat?.flatNumber}"? It will become unassigned.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmRemoveAssignment}
      />
    </div>
  )
}
