import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
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
import { StatCard } from '../../../components/ui/StatCard'
import { projectsApi } from '../../../utils/api'
import { ROUTES } from '../../../constants/routes'
import { useMotionSafe } from '../../../hooks/useMotionSafe'
import { cn } from '../../../utils/cn'
import type { Project } from '../../../types'
import {
  Pencil, Trash2, Plus, MapPin, Building2, ChevronRight,
  MoreHorizontal, PauseCircle, CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

type FilterKey = 'total' | 'active' | 'on_hold' | 'completed'

const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'
const easeOut = [0.22, 1, 0.36, 1] as const

export default function ProjectsList() {
  const { projects, loading, refresh } = useProjects()
  const { fadeUp, reduced, stagger } = useMotionSafe()

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    developerName: '',
    status: 'active' as Project['status'],
  })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)

  const counts = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active').length
    const onHold = projects.filter((p) => p.status === 'on_hold').length
    const completed = projects.filter((p) => p.status === 'completed').length
    return { total: projects.length, active, onHold, completed }
  }, [projects])

  const filtered = useMemo(() => {
    if (!activeFilter || activeFilter === 'total') return projects
    return projects.filter((p) => p.status === activeFilter)
  }, [projects, activeFilter])

  const selectFilter = (key: FilterKey) => {
    setActiveFilter((prev) => (prev === key ? null : key))
  }

  const create = async () => {
    try {
      await projectsApi.create({ name, location })
      toast.success('Project created')
      setCreateOpen(false)
      setName('')
      setLocation('')
      refresh()
    } catch {
      toast.error('Failed to create project')
    }
  }

  const openEdit = (p: Project) => {
    setEditProject(p)
    setEditForm({
      name: p.name,
      location: p.location,
      developerName: p.developerName || '',
      status: p.status,
    })
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

  const subtitle =
    activeFilter && activeFilter !== 'total'
      ? `${filtered.length} ${activeFilter.replace('_', ' ')}`
      : `${projects.length} project${projects.length !== 1 ? 's' : ''}`

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Projects</h1>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={subtitle}
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: easeOut }}
              className="text-[11px] text-ink-400"
            >
              {subtitle}
            </motion.p>
          </AnimatePresence>
        </div>
        <Button
          size="sm"
          className="!min-h-[36px] shrink-0 !px-2.5 !py-1.5 text-xs"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={14} aria-hidden="true" />
          <span className="sm:hidden">New</span>
          <span className="hidden sm:inline">New Project</span>
        </Button>
      </div>

      {loading && projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No Projects"
          description="Create your first project to get started."
          actionLabel="New Project"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard
              index={0}
              label="Total"
              value={counts.total}
              icon={Building2}
              selected={activeFilter === 'total'}
              onClick={() => selectFilter('total')}
            />
            <StatCard
              index={1}
              label="Active"
              value={counts.active}
              icon={Building2}
              colorClass="text-brand-600 bg-brand-100"
              selected={activeFilter === 'active'}
              onClick={() => selectFilter('active')}
            />
            <StatCard
              index={2}
              label="On Hold"
              value={counts.onHold}
              icon={PauseCircle}
              colorClass="text-warning-600 bg-warning-100"
              selected={activeFilter === 'on_hold'}
              onClick={() => selectFilter('on_hold')}
            />
            <StatCard
              index={3}
              label="Completed"
              value={counts.completed}
              icon={CheckCircle}
              colorClass="text-success-600 bg-success-100"
              selected={activeFilter === 'completed'}
              onClick={() => selectFilter('completed')}
            />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {filtered.length === 0 ? (
              <motion.div
                key="empty-filter"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.32, ease: easeOut }}
              >
                <EmptyState
                  title="No matches"
                  description="No projects for this status filter."
                  actionLabel="Clear filter"
                  onAction={() => setActiveFilter(null)}
                  className="py-10"
                />
              </motion.div>
            ) : (
              <motion.div
                key={`list-${activeFilter ?? 'all'}`}
                className="grid grid-cols-1 gap-2 md:grid-cols-2"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: 0.28, ease: easeOut }}
              >
                {filtered.map((p, i) => (
                  <motion.div
                    key={p.id}
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
                          to={ROUTES.ADMIN_PROJECT(p.id)}
                          className="group flex min-w-0 flex-1 items-center gap-2.5 p-3 touch-manipulation active:bg-ink-50/60"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 transition-colors duration-fast group-hover:bg-brand-600 group-hover:text-white">
                            <Building2 size={16} aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <h3 className="truncate text-sm font-semibold text-ink-950">{p.name}</h3>
                              <StatusBadge status={p.status} />
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-ink-400">
                              {p.location ? (
                                <span className="inline-flex max-w-full items-center gap-0.5">
                                  <MapPin size={11} className="shrink-0" aria-hidden="true" />
                                  <span className="truncate">{p.location}</span>
                                </span>
                              ) : null}
                              {p.location ? ' · ' : null}
                              {p.totalTowers} tower{p.totalTowers !== 1 ? 's' : ''}
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
                                aria-label={`Actions for ${p.name}`}
                                onClick={(e) => e.stopPropagation()}
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
                                  onSelect={() => openEdit(p)}
                                >
                                  <Pencil size={14} aria-hidden="true" />
                                  Edit
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-danger-600 outline-none data-[highlighted]:bg-danger-100"
                                  onSelect={() => {
                                    setDeleteTarget(p)
                                    setDeleteOpen(true)
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
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New Project">
        <div className="space-y-3">
          <div>
            <label className={fieldLabel}>Project Name</label>
            <Input
              placeholder="e.g. Green Heights Phase 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabel}>Location</label>
            <Input
              placeholder="e.g. Sector 45, Noida"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <Button onClick={create} className="w-full" disabled={!name.trim()}>
            Create Project
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
            <Button onClick={saveEdit} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project"
        message={`Delete "${deleteTarget?.name}"? All towers, flats, and assignments will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </motion.div>
  )
}
