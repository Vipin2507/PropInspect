import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { flatsApi, usersApi, assignmentsApi, towersApi } from '../../../utils/api'
import { Table, Th, Td } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Modal } from '../../../components/ui/Modal'
import { Badge } from '../../../components/ui/Badge'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { ROUTES } from '../../../constants/routes'
import type { Flat, User, Tower } from '../../../types'
import { ArrowLeft, Pencil, X, CheckSquare, Square, Users, Minus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function FlatManagement() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const [flats, setFlats] = useState<Flat[]>([])
  const [engineers, setEngineers] = useState<User[]>([])
  const [qas, setQas] = useState<User[]>([])
  const [towers, setTowers] = useState<Tower[]>([])
  const [loading, setLoading] = useState(true)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Bulk assign form
  const [bulkEngineerId, setBulkEngineerId] = useState('')
  const [bulkQaId, setBulkQaId] = useState('')

  // Filters
  const [filterTower, setFilterTower] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssignment, setFilterAssignment] = useState<'all' | 'assigned' | 'unassigned'>('all')

  // Edit assignment
  const [editOpen, setEditOpen] = useState(false)
  const [editFlat, setEditFlat] = useState<Flat | null>(null)
  const [editEngineerId, setEditEngineerId] = useState('')
  const [editQaId, setEditQaId] = useState('')

  // Remove assignment
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeFlat, setRemoveFlat] = useState<Flat | null>(null)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      projectId ? flatsApi.byProject(projectId).then(({ data }) => setFlats(data)) : Promise.resolve(),
      usersApi.list('engineer').then(({ data }) => setEngineers(data)),
      usersApi.list('qa').then(({ data }) => setQas(data)),
      projectId ? towersApi.list(projectId).then(({ data }) => setTowers(data)) : Promise.resolve(),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  // Filtered flats
  const filteredFlats = useMemo(() => {
    return flats.filter((f) => {
      if (filterTower && f.towerId !== filterTower) return false
      if (filterStatus && f.status !== filterStatus) return false
      if (filterAssignment === 'assigned' && !f.assignment) return false
      if (filterAssignment === 'unassigned' && f.assignment) return false
      return true
    })
  }, [flats, filterTower, filterStatus, filterAssignment])

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFlats.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredFlats.map((f) => f.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const selectedCount = selectedIds.size
  const allSelected = filteredFlats.length > 0 && selectedIds.size === filteredFlats.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredFlats.length

  // Bulk assign
  const bulkAssign = async () => {
    if (!bulkEngineerId || !bulkQaId) {
      toast.error('Select both Engineer and QA')
      return
    }
    const flatIds = Array.from(selectedIds)
    try {
      const { data } = await assignmentsApi.bulkCreate({ flatIds, engineerId: bulkEngineerId, qaId: bulkQaId })
      const createdCount = data.created.length
      const skippedCount = data.skipped.length
      if (createdCount > 0) {
        toast.success(`Assigned ${createdCount} flat${createdCount > 1 ? 's' : ''}`)
      }
      if (skippedCount > 0) {
        toast(`${skippedCount} flat${skippedCount > 1 ? 's' : ''} skipped (already assigned)`, { icon: 'ℹ️' })
      }
      clearSelection()
      setBulkEngineerId('')
      setBulkQaId('')
      loadData()
    } catch {
      toast.error('Failed to assign flats')
    }
  }

  // Edit existing assignment
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
    setEditOpen(false)
    loadData()
  }

  // Remove assignment
  const confirmRemoveAssignment = async () => {
    if (!removeFlat?.assignment) return
    await assignmentsApi.delete(removeFlat.assignment.id)
    toast.success('Assignment removed')
    setRemoveOpen(false)
    loadData()
  }

  const statCounts = useMemo(() => {
    const total = flats.length
    const assigned = flats.filter((f) => f.assignment).length
    const unassigned = total - assigned
    return { total, assigned, unassigned }
  }, [flats])

  if (loading) return <p className="p-4">Loading...</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(ROUTES.ADMIN_PROJECT(projectId!))} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
          <ArrowLeft size={16} /> Back to Project
        </button>
        <h1 className="text-xl font-bold sm:text-2xl">Flat Management</h1>
        <p className="mt-1 text-sm text-slate-500">Assign engineers and QA reviewers to flats</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{statCounts.total}</div>
          <div className="text-xs text-slate-500">Total Flats</div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{statCounts.assigned}</div>
          <div className="text-xs text-green-600">Assigned</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
          <div className="text-2xl font-bold text-amber-700">{statCounts.unassigned}</div>
          <div className="text-xs text-amber-600">Unassigned</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={filterTower} onChange={(e) => setFilterTower(e.target.value)} className="w-auto min-w-[140px]">
          <option value="">All Towers</option>
          {towers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-auto min-w-[140px]">
          <option value="">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="revision_required">Revision Required</option>
          <option value="desnagging">Desnagging</option>
        </Select>
        <Select value={filterAssignment} onChange={(e) => setFilterAssignment(e.target.value as 'all' | 'assigned' | 'unassigned')} className="w-auto min-w-[140px]">
          <option value="all">All Assignments</option>
          <option value="assigned">Assigned Only</option>
          <option value="unassigned">Unassigned Only</option>
        </Select>
        <div className="ml-auto text-sm text-slate-500 self-center">
          Showing {filteredFlats.length} of {flats.length} flats
        </div>
      </div>

      {/* Bulk Assignment Toolbar */}
      {selectedCount > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <span className="font-semibold text-primary">{selectedCount} flat{selectedCount > 1 ? 's' : ''} selected</span>
            <button onClick={clearSelection} className="ml-1 text-xs text-slate-500 underline hover:text-slate-700">Clear</button>
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <Select value={bulkEngineerId} onChange={(e) => setBulkEngineerId(e.target.value)} className="flex-1">
              <option value="">Select Engineer</option>
              {engineers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
            <Select value={bulkQaId} onChange={(e) => setBulkQaId(e.target.value)} className="flex-1">
              <option value="">Select QA</option>
              {qas.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
            <Button onClick={bulkAssign} className="whitespace-nowrap">
              Assign Selected
            </Button>
          </div>
        </div>
      )}

      {/* Flats Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <Table>
          <thead>
            <tr>
              <Th>
                <button onClick={toggleSelectAll} className="flex items-center gap-1 text-slate-500 hover:text-primary" title="Select all">
                  {allSelected ? <CheckSquare size={18} className="text-primary" /> : someSelected ? <Minus size={18} className="text-primary" /> : <Square size={18} />}
                </button>
              </Th>
              <Th>Flat</Th>
              <Th>Tower</Th>
              <Th>Floor</Th>
              <Th>Status</Th>
              <Th>Engineer</Th>
              <Th>QA</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredFlats.map((f) => {
              const isSelected = selectedIds.has(f.id)
              const hasAssignment = !!f.assignment
              return (
                <tr
                  key={f.id}
                  className={`transition ${isSelected ? 'bg-primary/5' : ''} ${!hasAssignment ? 'bg-amber-50/30' : ''}`}
                >
                  <Td>
                    <button onClick={() => toggleSelect(f.id)} className="flex items-center text-slate-500 hover:text-primary">
                      {isSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                    </button>
                  </Td>
                  <Td>
                    <span className="font-medium text-slate-900">{f.flatNumber}</span>
                  </Td>
                  <Td>{f.towerName || '—'}</Td>
                  <Td>{f.floorLabel || '—'}</Td>
                  <Td><Badge status={f.status} /></Td>
                  <Td>
                    {f.assignment?.engineerName ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        {f.assignment.engineerName}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">Unassigned</span>
                    )}
                  </Td>
                  <Td>
                    {f.assignment?.qaName ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        {f.assignment.qaName}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">Unassigned</span>
                    )}
                  </Td>
                  <Td>
                    {hasAssignment ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditAssignment(f)}
                          title="Edit assignment"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRemoveFlat(f)
                            setRemoveOpen(true)
                          }}
                          className="text-red-500 hover:bg-red-50"
                          title="Remove assignment"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </div>

      {filteredFlats.length === 0 && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 py-12 text-center text-slate-400">
          No flats match the current filters.
        </div>
      )}

      {/* Edit Assignment Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title={`Edit Assignment — ${editFlat?.flatNumber}`}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Engineer</label>
            <Select value={editEngineerId} onChange={(e) => setEditEngineerId(e.target.value)}>
              <option value="">Select Engineer</option>
              {engineers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">QA Reviewer</label>
            <Select value={editQaId} onChange={(e) => setEditQaId(e.target.value)}>
              <option value="">Select QA</option>
              {qas.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveEditAssignment} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Remove Assignment Confirmation */}
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove Assignment"
        message={`Remove the engineer and QA assignment from flat "${removeFlat?.flatNumber}"? The flat will become unassigned.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmRemoveAssignment}
      />
    </div>
  )
}
