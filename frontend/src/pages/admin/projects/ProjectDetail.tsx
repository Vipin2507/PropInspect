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
import { Spinner } from '../../../components/ui/Spinner'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ROUTES } from '../../../constants/routes'
import type { Project, Tower } from '../../../types'
import { Pencil, Trash2, Plus, MapPin, ArrowLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const { towers, loading, refresh: refreshTowers } = useTowers(id || null)

  const [towerOpen, setTowerOpen]   = useState(false)
  const [towerForm, setTowerForm]   = useState({ name: 'Tower A', totalFloors: 3, unitsPerFloor: 5, unitPrefix: 'A-', startNumber: 101 })
  const [editOpen, setEditOpen]     = useState(false)
  const [editForm, setEditForm]     = useState({ name: '', location: '', developerName: '', status: 'active' as 'active' | 'completed' | 'on_hold' })
  const [towerEditOpen, setTowerEditOpen] = useState(false)
  const [editTower, setEditTower]   = useState<Tower | null>(null)
  const [towerEditName, setTowerEditName] = useState('')
  const [towerDeleteOpen, setTowerDeleteOpen] = useState(false)
  const [deleteTower, setDeleteTower] = useState<Tower | null>(null)

  const loadProject = () => {
    if (id) {
      projectsApi.get(id)
        .then(({ data }) => setProject(data))
        .catch(() => projectsApi.list().then(({ data }) => setProject(data.find((p) => p.id === id) || null)))
    }
  }

  useEffect(() => { loadProject() }, [id])

  const addTower = async () => {
    if (!id) return
    await towersApi.create({ projectId: id, ...towerForm })
    toast.success('Tower created')
    setTowerOpen(false)
    refreshTowers()
    loadProject()
  }

  const saveProject = async () => {
    if (!id) return
    await projectsApi.update(id, editForm)
    toast.success('Project updated')
    setEditOpen(false)
    loadProject()
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

  if (!project) {
    return <div className="flex flex-1 items-center justify-center py-24"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate(ROUTES.ADMIN_PROJECTS)}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary">
        <ArrowLeft size={18} aria-hidden="true" /> Back to Projects
      </button>

      {/* Project header */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <Badge status={project.status} />
            </div>
            {project.location && (
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                <MapPin size={14} aria-hidden="true" /> {project.location}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            setEditForm({ name: project.name, location: project.location, developerName: project.developerName || '', status: project.status })
            setEditOpen(true)
          }}>
            <Pencil size={14} aria-hidden="true" /> Edit
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => setTowerOpen(true)} className="flex-1 sm:flex-none">
          <Plus size={16} aria-hidden="true" /> Add Tower
        </Button>
        <Link to={ROUTES.ADMIN_FLATS(id!)} className="flex-1 sm:flex-none">
          <Button variant="outline" className="w-full">Manage Flats &amp; Assignments</Button>
        </Link>
      </div>

      {/* Towers list */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-700">
          Towers ({towers.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : towers.length === 0 ? (
          <EmptyState title="No Towers" description='Click "Add Tower" to get started.' />
        ) : (
          <div className="space-y-2">
            {towers.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Link to={ROUTES.ADMIN_TOWER(id!, t.id)} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">
                      {t.totalFloors} floors · {t.unitsPerFloor} units/floor
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
                </Link>
                <div className="flex gap-2 border-t border-slate-100 px-4 py-2.5">
                  <Button variant="outline" size="sm" className="flex-1"
                    onClick={() => { setEditTower(t); setTowerEditName(t.name); setTowerEditOpen(true) }}>
                    <Pencil size={14} aria-hidden="true" /> Rename
                  </Button>
                  <Button variant="danger" size="sm" className="flex-1"
                    onClick={() => { setDeleteTower(t); setTowerDeleteOpen(true) }}>
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Tower Modal */}
      <Modal open={towerOpen} onOpenChange={setTowerOpen} title="Add Tower">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tower Name</label>
            <Input value={towerForm.name} onChange={(e) => setTowerForm({ ...towerForm, name: e.target.value })} placeholder="e.g. Tower A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Floors</label>
              <Input type="number" min={1} value={towerForm.totalFloors}
                onChange={(e) => setTowerForm({ ...towerForm, totalFloors: +e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Units/Floor</label>
              <Input type="number" min={1} value={towerForm.unitsPerFloor}
                onChange={(e) => setTowerForm({ ...towerForm, unitsPerFloor: +e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Unit Prefix</label>
            <Input value={towerForm.unitPrefix} onChange={(e) => setTowerForm({ ...towerForm, unitPrefix: e.target.value })} placeholder="e.g. A-" />
            <p className="mt-1 text-xs text-slate-400">Flat numbers: {towerForm.unitPrefix}101, {towerForm.unitPrefix}102…</p>
          </div>
          <Button onClick={addTower} className="w-full" disabled={!towerForm.name.trim()}>
            Create Tower &amp; Flats
          </Button>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Project">
        <div className="space-y-4">
          {[
            { label: 'Name', key: 'name' },
            { label: 'Location', key: 'location' },
            { label: 'Developer', key: 'developerName' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
              <Input value={(editForm as any)[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
            <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveProject} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Rename Tower Modal */}
      <Modal open={towerEditOpen} onOpenChange={setTowerEditOpen} title="Rename Tower">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tower Name</label>
            <Input value={towerEditName} onChange={(e) => setTowerEditName(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setTowerEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveTower} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={towerDeleteOpen} onOpenChange={setTowerDeleteOpen}
        title="Delete Tower"
        message={`Delete "${deleteTower?.name}"? All flats and assignments will be removed.`}
        confirmLabel="Delete" variant="danger" onConfirm={confirmDeleteTower}
      />
    </div>
  )
}
