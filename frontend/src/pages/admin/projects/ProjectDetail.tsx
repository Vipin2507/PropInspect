import { Link, useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { projectsApi, towersApi } from '../../../utils/api'
import { useTowers } from '../../../hooks/useTowers'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Spinner } from '../../../components/ui/Spinner'
import { EmptyState } from '../../../components/ui/EmptyState'
import { StatCard } from '../../../components/ui/StatCard'
import { ROUTES } from '../../../constants/routes'
import { useMotionSafe } from '../../../hooks/useMotionSafe'
import { cn } from '../../../utils/cn'
import type { Project, Tower } from '../../../types'
import {
  Pencil, Trash2, Plus, MapPin, ArrowLeft, ChevronRight, FileUp,
  MoreHorizontal, Building2, Layers, Home, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { BulkStatusUploadModal } from '../../../components/BulkStatusUploadModal'

const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const [project, setProject] = useState<Project | null>(null)
  const { towers, loading, refresh: refreshTowers } = useTowers(id || null)

  const [towerOpen, setTowerOpen] = useState(false)
  const [towerForm, setTowerForm] = useState({
    name: 'Tower A',
    totalFloors: 3,
    unitsPerFloor: 5,
    unitPrefix: 'A-',
    startNumber: 101,
  })
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    developerName: '',
    status: 'active' as Project['status'],
  })
  const [towerEditOpen, setTowerEditOpen] = useState(false)
  const [editTower, setEditTower] = useState<Tower | null>(null)
  const [towerEditName, setTowerEditName] = useState('')
  const [towerDeleteOpen, setTowerDeleteOpen] = useState(false)
  const [deleteTower, setDeleteTower] = useState<Tower | null>(null)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)

  const stats = useMemo(() => {
    const floors = towers.reduce((n, t) => n + (t.totalFloors || 0), 0)
    const units = towers.reduce(
      (n, t) => n + (t.totalFloors || 0) * (t.unitsPerFloor || 0),
      0
    )
    return { towers: towers.length, floors, units }
  }, [towers])

  const loadProject = async () => {
    if (!id) return
    try {
      const db = await (await import('../../../utils/db')).getDb()
      const cached = (await db.get('projects', id)) as Project | undefined
      if (cached) setProject(cached)
    } catch {
      /* ignore */
    }
    try {
      const { data } = await projectsApi.get(id)
      const db = await (await import('../../../utils/db')).getDb()
      await db.put('projects', data as never)
      setProject(data)
    } catch {
      /* stay with cached */
    }
  }

  useEffect(() => {
    loadProject()
  }, [id])

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

  const openEditProject = () => {
    if (!project) return
    setEditForm({
      name: project.name,
      location: project.location,
      developerName: project.developerName || '',
      status: project.status,
    })
    setEditOpen(true)
  }

  if (!project) {
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
        onClick={() => navigate(ROUTES.ADMIN_PROJECTS)}
        className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors duration-fast hover:text-brand-600 touch-manipulation"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Projects
      </button>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h1 className="truncate font-display text-lg font-bold text-ink-950 md:text-xl">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-ink-400">
            {project.location ? (
              <span className="inline-flex max-w-full items-center gap-0.5">
                <MapPin size={11} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{project.location}</span>
              </span>
            ) : (
              'No location set'
            )}
            {project.developerName ? ` · ${project.developerName}` : null}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn(compactBtn, 'shrink-0')}
          onClick={openEditProject}
        >
          <Pencil size={13} aria-hidden="true" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard index={0} label="Towers" value={stats.towers} icon={Building2} />
        <StatCard
          index={1}
          label="Floors"
          value={stats.floors}
          icon={Layers}
          colorClass="text-brand-600 bg-brand-100"
        />
        <StatCard
          index={2}
          label="Units"
          value={stats.units}
          icon={Home}
          colorClass="text-success-600 bg-success-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setTowerOpen(true)}
          className="group flex items-center gap-2.5 rounded-md border border-ink-100/80 bg-surface p-2.5 text-left shadow-xs transition-all duration-fast hover:border-brand-300 hover:shadow-sm active:scale-[0.98] touch-manipulation"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors group-hover:bg-brand-700">
            <Plus size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-950">Add Tower</p>
            <p className="text-[11px] text-ink-400">Create floors &amp; flats</p>
          </div>
        </button>
        <Link
          to={ROUTES.ADMIN_FLATS(id!)}
          className="group flex items-center gap-2.5 rounded-md border border-ink-100/80 bg-surface p-2.5 shadow-xs transition-all duration-fast hover:border-brand-300 hover:shadow-sm active:scale-[0.98] touch-manipulation"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
            <Users size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-950">Manage Flats</p>
            <p className="text-[11px] text-ink-400">Assignments &amp; QA</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setBulkUploadOpen(true)}
          className="group flex items-center gap-2.5 rounded-md border border-ink-100/80 bg-surface p-2.5 text-left shadow-xs transition-all duration-fast hover:border-brand-300 hover:shadow-sm active:scale-[0.98] touch-manipulation"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-600 transition-colors group-hover:bg-warning-600 group-hover:text-white">
            <FileUp size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-950">Bulk Status</p>
            <p className="text-[11px] text-ink-400">Upload checklist Excel</p>
          </div>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          Towers
        </h2>
        <span className="text-[11px] tabular text-ink-400">{towers.length}</span>
      </div>

      {loading && towers.length === 0 ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : towers.length === 0 ? (
        <EmptyState
          title="No Towers"
          description="Add a tower to generate floors and flats."
          actionLabel="Add Tower"
          onAction={() => setTowerOpen(true)}
          className="py-10"
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {towers.map((t, i) => (
              <motion.div
                key={t.id}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(i)}
              >
                <Card
                  className={cn(
                    'overflow-hidden shadow-xs',
                    'transition-shadow duration-fast hover:shadow-sm hover:border-brand-200/80'
                  )}
                >
                  <div className="flex items-stretch">
                    <Link
                      to={ROUTES.ADMIN_TOWER(id!, t.id)}
                      className="group flex min-w-0 flex-1 items-center gap-2.5 p-3 touch-manipulation active:bg-ink-50/60"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 transition-colors duration-fast group-hover:bg-brand-600 group-hover:text-white">
                        <Building2 size={16} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-950">{t.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-ink-400">
                          {t.totalFloors} floors · {t.unitsPerFloor}/floor
                          {t.unitPrefix ? ` · ${t.unitPrefix}*` : ''}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-300 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-brand-500"
                        aria-hidden="true"
                      />
                    </Link>

                    <div className="flex items-center border-l border-ink-100 pr-1">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-md text-ink-400 transition-colors duration-fast hover:bg-ink-50 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
                            aria-label={`Actions for ${t.name}`}
                          >
                            <MoreHorizontal size={18} aria-hidden="true" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            sideOffset={6}
                            className="z-50 min-w-[160px] overflow-hidden rounded-lg border border-ink-100 bg-white p-1 shadow-md"
                          >
                            <DropdownMenu.Item
                              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-ink-800 outline-none data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700"
                              onSelect={() => {
                                setEditTower(t)
                                setTowerEditName(t.name)
                                setTowerEditOpen(true)
                              }}
                            >
                              <Pencil size={14} aria-hidden="true" />
                              Rename
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />
                            <DropdownMenu.Item
                              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-danger-600 outline-none data-[highlighted]:bg-danger-100"
                              onSelect={() => {
                                setDeleteTower(t)
                                setTowerDeleteOpen(true)
                              }}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              Delete
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={towerOpen} onOpenChange={setTowerOpen} title="Add Tower">
        <div className="space-y-3">
          <div>
            <label className={fieldLabel}>Tower Name</label>
            <Input
              value={towerForm.name}
              onChange={(e) => setTowerForm({ ...towerForm, name: e.target.value })}
              placeholder="e.g. Tower A"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={fieldLabel}>Floors</label>
              <Input
                type="number"
                min={1}
                value={towerForm.totalFloors}
                onChange={(e) => setTowerForm({ ...towerForm, totalFloors: +e.target.value })}
              />
            </div>
            <div>
              <label className={fieldLabel}>Units / Floor</label>
              <Input
                type="number"
                min={1}
                value={towerForm.unitsPerFloor}
                onChange={(e) => setTowerForm({ ...towerForm, unitsPerFloor: +e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={fieldLabel}>Unit Prefix</label>
            <Input
              value={towerForm.unitPrefix}
              onChange={(e) => setTowerForm({ ...towerForm, unitPrefix: e.target.value })}
              placeholder="e.g. A-"
            />
            <p className="mt-1 text-[11px] text-ink-400">
              Flat numbers: {towerForm.unitPrefix}101, {towerForm.unitPrefix}102…
            </p>
          </div>
          <Button onClick={addTower} className="w-full" disabled={!towerForm.name.trim()}>
            Create Tower &amp; Flats
          </Button>
        </div>
      </Modal>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Project">
        <div className="space-y-3">
          {(
            [
              { label: 'Name', key: 'name' as const },
              { label: 'Location', key: 'location' as const },
              { label: 'Developer', key: 'developerName' as const },
            ] as const
          ).map(({ label, key }) => (
            <div key={key}>
              <label className={fieldLabel}>{label}</label>
              <Input
                value={editForm[key]}
                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className={fieldLabel}>Status</label>
            <Select
              value={editForm.status}
              onChange={(e) =>
                setEditForm({ ...editForm, status: e.target.value as Project['status'] })
              }
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={saveProject} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={towerEditOpen} onOpenChange={setTowerEditOpen} title="Rename Tower">
        <div className="space-y-3">
          <div>
            <label className={fieldLabel}>Tower Name</label>
            <Input value={towerEditName} onChange={(e) => setTowerEditName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTowerEditOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={saveTower} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={towerDeleteOpen}
        onOpenChange={setTowerDeleteOpen}
        title="Delete Tower"
        message={`Delete "${deleteTower?.name}"? All flats and assignments will be removed.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteTower}
      />

      <BulkStatusUploadModal
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        projectId={id!}
        projectName={project.name}
        onSuccess={loadProject}
      />
    </motion.div>
  )
}
