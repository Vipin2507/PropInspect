import { Link, useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { projectsApi, towersApi } from '../../../utils/api'
import { useTowers } from '../../../hooks/useTowers'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Badge } from '../../../components/ui/Badge'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { ROUTES } from '../../../constants/routes'
import type { Project, Tower } from '../../../types'
import { Pencil, Trash2, Plus, MapPin, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const { towers, loading, refresh: refreshTowers } = useTowers(id || null)

  // Tower create
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerForm, setTowerForm] = useState({ name: 'Tower A', totalFloors: 3, unitsPerFloor: 5, unitPrefix: 'A-', startNumber: 101 })

  // Project edit
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', location: '', developerName: '', status: 'active' as 'active' | 'completed' | 'on_hold' })

  // Tower edit
  const [towerEditOpen, setTowerEditOpen] = useState(false)
  const [editTower, setEditTower] = useState<Tower | null>(null)
  const [towerEditName, setTowerEditName] = useState('')

  // Tower delete
  const [towerDeleteOpen, setTowerDeleteOpen] = useState(false)
  const [deleteTower, setDeleteTower] = useState<Tower | null>(null)

  const loadProject = () => {
    if (id) projectsApi.get(id).then(({ data }) => setProject(data)).catch(() =>
      projectsApi.list().then(({ data }) => setProject(data.find((p) => p.id === id) || null))
    )
  }

  useEffect(() => {
    loadProject()
  }, [id])

  const addTower = async () => {
    if (!id) return
    await towersApi.create({ projectId: id, ...towerForm })
    toast.success('Tower created with flats')
    setTowerOpen(false)
    refreshTowers()
    loadProject()
  }

  const openEditProject = () => {
    if (!project) return
    setEditForm({ name: project.name, location: project.location, developerName: project.developerName || '', status: project.status })
    setEditOpen(true)
  }

  const saveProject = async () => {
    if (!id) return
    await projectsApi.update(id, editForm)
    toast.success('Project updated')
    setEditOpen(false)
    loadProject()
  }

  const openEditTower = (t: Tower) => {
    setEditTower(t)
    setTowerEditName(t.name)
    setTowerEditOpen(true)
  }

  const saveTower = async () => {
    if (!editTower) return
    await towersApi.update(editTower.id, { name: towerEditName })
    toast.success('Tower renamed')
    setTowerEditOpen(false)
    refreshTowers()
  }

  const confirmDeleteTower = async () => {
    if (!deleteTower) return
    await towersApi.delete(deleteTower.id)
    toast.success('Tower deleted')
    setTowerDeleteOpen(false)
    refreshTowers()
    loadProject()
  }

  if (!project) return <p>Loading...</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(ROUTES.ADMIN_PROJECTS)} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
          <ArrowLeft size={16} /> Back to Projects
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold sm:text-2xl">{project.name}</h1>
              <Badge status={project.status}>{project.status?.replace(/_/g, ' ')}</Badge>
            </div>
            {project.location && (
              <p className="mt-1 flex items-center gap-1 text-slate-500">
                <MapPin size={16} /> {project.location}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEditProject}>
              <Pencil size={14} /> Edit Project
            </Button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Button onClick={() => setTowerOpen(true)}>
          <Plus size={16} /> Add Tower
        </Button>
        <Link to={ROUTES.ADMIN_FLATS(id!)}>
          <Button variant="outline">Manage Flats & Assignments</Button>
        </Link>
      </div>

      {/* Towers */}
      <h2 className="mb-3 font-semibold text-slate-700">Towers ({towers.length})</h2>
      {loading ? (
        <p>Loading...</p>
      ) : towers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center text-slate-400">
          No towers yet. Click "Add Tower" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {towers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-sm"
            >
              <Link to={ROUTES.ADMIN_TOWER(id!, t.id)} className="flex-1">
                <span className="font-medium text-slate-900">{t.name}</span>
                <span className="ml-3 text-sm text-slate-500">
                  {t.totalFloors} floors × {t.unitsPerFloor} units
                </span>
              </Link>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    openEditTower(t)
                  }}
                  title="Rename tower"
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    setDeleteTower(t)
                    setTowerDeleteOpen(true)
                  }}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  title="Delete tower"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tower Modal */}
      <Modal open={towerOpen} onOpenChange={setTowerOpen} title="Add Tower">
        <p className="mb-4 text-sm text-slate-500">Create a new tower with floors and flat units. Flat numbers will be auto-generated based on floor (e.g. Floor 1 → 101, 102… Floor 2 → 201, 202…).</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tower Name <span className="text-red-400">*</span></label>
            <Input value={towerForm.name} onChange={(e) => setTowerForm({ ...towerForm, name: e.target.value })} placeholder="e.g. Tower A, Wing 1, Block B" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Total Floors <span className="text-red-400">*</span></label>
              <Input type="number" min={1} value={towerForm.totalFloors} onChange={(e) => setTowerForm({ ...towerForm, totalFloors: +e.target.value })} placeholder="e.g. 10" />
              <p className="mt-1 text-xs text-slate-400">Number of floors in the tower</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Units per Floor <span className="text-red-400">*</span></label>
              <Input type="number" min={1} value={towerForm.unitsPerFloor} onChange={(e) => setTowerForm({ ...towerForm, unitsPerFloor: +e.target.value })} placeholder="e.g. 4" />
              <p className="mt-1 text-xs text-slate-400">Flats on each floor</p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Unit Prefix</label>
            <Input value={towerForm.unitPrefix} onChange={(e) => setTowerForm({ ...towerForm, unitPrefix: e.target.value })} placeholder="e.g. A-, T1-, B-" />
            <p className="mt-1 text-xs text-slate-400">Prefix for flat numbers (e.g. "A-" → A-101, A-102…)</p>
          </div>
          <Button onClick={addTower} className="w-full" disabled={!towerForm.name.trim()}>Create Tower & Flats</Button>
        </div>
      </Modal>

      {/* Edit Project Modal */}
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
            <Button onClick={saveProject} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Tower Modal */}
      <Modal open={towerEditOpen} onOpenChange={setTowerEditOpen} title="Rename Tower">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tower Name</label>
            <Input value={towerEditName} onChange={(e) => setTowerEditName(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setTowerEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveTower} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Tower Confirmation */}
      <ConfirmDialog
        open={towerDeleteOpen}
        onOpenChange={setTowerDeleteOpen}
        title="Delete Tower"
        message={`Are you sure you want to delete "${deleteTower?.name}"? All flats and assignments within this tower will be removed.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteTower}
      />
    </div>
  )
}
