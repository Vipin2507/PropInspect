import { Link } from 'react-router-dom'
import { useProjects } from '../../../hooks/useProjects'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Spinner } from '../../../components/ui/Spinner'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useState } from 'react'
import { projectsApi } from '../../../utils/api'
import { ROUTES } from '../../../constants/routes'
import type { Project } from '../../../types'
import { Pencil, Trash2, Plus, MapPin, Building2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProjectsList() {
  const { projects, loading, refresh } = useProjects()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName]         = useState('')
  const [location, setLocation] = useState('')
  const [editOpen, setEditOpen]     = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [editForm, setEditForm] = useState({ name: '', location: '', developerName: '', status: 'active' as 'active' | 'completed' | 'on_hold' })
  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const create = async () => {
    try {
      await projectsApi.create({ name, location })
      toast.success('Project created')
      setCreateOpen(false)
      setName(''); setLocation('')
      refresh()
    } catch { toast.error('Failed to create project') }
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-h2 text-ink-950">Projects</h1>
          <p className="text-body text-ink-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} aria-hidden="true" /> New Project
        </Button>
      </div>

      {loading && projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState title="No Projects" description="Create your first project to get started." />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <Link to={ROUTES.ADMIN_PROJECT(p.id)} className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <Building2 size={22} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-ink-950">{p.name}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.location && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-body text-ink-500">
                      <MapPin size={13} aria-hidden="true" /> {p.location}
                    </p>
                  )}
                  <p className="mt-0.5 text-caption text-ink-400">
                    {p.totalTowers} tower{p.totalTowers !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-ink-400" aria-hidden="true" />
              </Link>

              <div className="flex gap-2 border-t border-ink-100 px-4 py-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => { e.preventDefault(); openEdit(p) }}
                >
                  <Pencil size={14} aria-hidden="true" /> Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => { e.preventDefault(); setDeleteTarget(p); setDeleteOpen(true) }}
                >
                  <Trash2 size={14} aria-hidden="true" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New Project">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Project Name</label>
            <Input placeholder="e.g. Green Heights Phase 2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Location</label>
            <Input placeholder="e.g. Sector 45, Noida" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <Button onClick={create} className="w-full" disabled={!name.trim()}>Create Project</Button>
        </div>
      </Modal>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Project">
        <div className="space-y-4">
          {[
            { label: 'Name', key: 'name' },
            { label: 'Location', key: 'location' },
            { label: 'Developer', key: 'developerName' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
              <Input value={(editForm as any)[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Status</label>
            <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveEdit} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen} onOpenChange={setDeleteOpen}
        title="Delete Project"
        message={`Delete "${deleteTarget?.name}"? All towers, flats, and assignments will be removed. This cannot be undone.`}
        confirmLabel="Delete" variant="danger" onConfirm={confirmDelete}
      />
    </div>
  )
}
