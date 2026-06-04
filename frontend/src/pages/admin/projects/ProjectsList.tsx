import { Link } from 'react-router-dom'
import { useProjects } from '../../../hooks/useProjects'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Badge } from '../../../components/ui/Badge'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useState } from 'react'
import { projectsApi } from '../../../utils/api'
import { ROUTES } from '../../../constants/routes'
import type { Project } from '../../../types'
import { Pencil, Trash2, Plus, MapPin, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProjectsList() {
  const { projects, loading, refresh } = useProjects()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [editForm, setEditForm] = useState({ name: '', location: '', developerName: '', status: 'active' as 'active' | 'completed' | 'on_hold' })

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const create = async () => {
    await projectsApi.create({ name, location })
    toast.success('Project created')
    setCreateOpen(false)
    setName('')
    setLocation('')
    refresh()
  }

  const openEdit = (p: Project) => {
    setEditProject(p)
    setEditForm({ name: p.name, location: p.location, developerName: p.developerName || '', status: p.status })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editProject) return
    await projectsApi.update(editProject.id, editForm)
    toast.success('Project updated')
    setEditOpen(false)
    refresh()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await projectsApi.delete(deleteTarget.id)
    toast.success('Project deleted')
    setDeleteOpen(false)
    refresh()
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Project
        </Button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="group relative rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <Link to={ROUTES.ADMIN_PROJECT(p.id)} className="block p-4 pb-14">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  <Badge status={p.status}>{p.status?.replace(/_/g, ' ')}</Badge>
                </div>
                {p.location && (
                  <p className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin size={14} /> {p.location}
                  </p>
                )}
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  <Building2 size={14} /> {p.totalTowers} tower{p.totalTowers !== 1 ? 's' : ''}
                </p>
              </Link>
              <div className="absolute bottom-3 left-4 right-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openEdit(p)
                  }}
                >
                  <Pencil size={14} /> Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDeleteTarget(p)
                    setDeleteOpen(true)
                  }}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Create Project">
        <p className="mb-4 text-sm text-slate-500">Add a new project to manage towers, flats, and inspections.</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project Name <span className="text-red-400">*</span></label>
            <Input placeholder="e.g. Sunrise Heights, Green Valley Phase 2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <Input placeholder="e.g. Sector 45, Gurugram" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <Button onClick={create} className="w-full" disabled={!name.trim()}>Create Project</Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Project">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project Name</label>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Developer Name</label>
            <Input value={editForm.developerName} onChange={(e) => setEditForm({ ...editForm, developerName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'completed' | 'on_hold' })}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveEdit} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove all associated towers, flats, and assignments. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
