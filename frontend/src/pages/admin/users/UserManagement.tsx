import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useUsers } from '../../../hooks/useUsers'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Spinner } from '../../../components/ui/Spinner'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Card } from '../../../components/ui/Card'
import { StatCard } from '../../../components/ui/StatCard'
import { usersApi } from '../../../utils/api'
import { useMotionSafe } from '../../../hooks/useMotionSafe'
import { cn } from '../../../utils/cn'
import type { User, UserRole } from '../../../types'
import {
  Pencil, Plus, Power, UserCheck, UserX, KeyRound, Search,
  Users, Wrench, Eye, Shield, MoreHorizontal, Mail, Phone,
} from 'lucide-react'
import toast from 'react-hot-toast'

type FilterKey = 'all' | 'active' | 'inactive' | UserRole

const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'
const easeOut = [0.22, 1, 0.36, 1] as const
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'

const ROLE_LABEL: Record<string, string> = {
  engineer: 'Engineer',
  qa: 'QA',
  admin: 'Admin',
  viewer: 'Viewer',
}

const ROLE_COLOR: Record<string, string> = {
  engineer: 'bg-warning-100 text-warning-700',
  qa: 'bg-brand-100 text-brand-600',
  admin: 'bg-ink-100 text-ink-700',
  viewer: 'bg-ink-50 text-ink-500',
}

const emptyCreate = { name: '', email: '', mobile: '', password: '', role: 'engineer' as UserRole }

export default function UserManagement() {
  const { users, loading, refresh } = useUsers()
  const { fadeUp, reduced, stagger } = useMotionSafe()

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'engineer' as UserRole,
  })
  const [toggleOpen, setToggleOpen] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingReset, setSavingReset] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => {
    const c = {
      all: users.length,
      active: 0,
      inactive: 0,
      engineer: 0,
      qa: 0,
      admin: 0,
      viewer: 0,
    }
    for (const u of users) {
      if (u.isActive) c.active++
      else c.inactive++
      if (u.role in c) (c as Record<string, number>)[u.role]++
    }
    return c
  }, [users])

  const filtered = useMemo(() => {
    let list = users
    if (filter === 'active') list = list.filter((u) => u.isActive)
    else if (filter === 'inactive') list = list.filter((u) => !u.isActive)
    else if (filter !== 'all') list = list.filter((u) => u.role === filter)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.mobile?.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      )
    }
    return list
  }, [users, filter, search])

  const selectFilter = (key: FilterKey) => {
    setFilter((prev) => (prev === key ? 'all' : key))
  }

  const create = async () => {
    try {
      await usersApi.create(createForm)
      toast.success('User created')
      setCreateOpen(false)
      setCreateForm(emptyCreate)
      refresh()
    } catch {
      toast.error('Failed to create user')
    }
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setEditForm({ name: u.name, email: u.email, mobile: u.mobile, role: u.role })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editUser) return
    try {
      await usersApi.update(editUser.id, editForm)
      toast.success('User updated')
      setEditOpen(false)
      refresh()
    } catch {
      toast.error('Failed to update user')
    }
  }

  const confirmToggle = async () => {
    if (!toggleTarget) return
    try {
      await usersApi.toggleActive(toggleTarget.id)
      toast.success(`User ${toggleTarget.isActive ? 'deactivated' : 'activated'}`)
      setToggleOpen(false)
      refresh()
    } catch {
      toast.error('Failed to update user')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    setSavingReset(true)
    try {
      await usersApi.resetPassword(resetTarget.id, newPassword)
      toast.success(`Password reset for ${resetTarget.name}.`)
      setResetOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to reset password.')
    } finally {
      setSavingReset(false)
    }
  }

  const subtitle =
    filter === 'all' && !search
      ? `${users.length} member${users.length !== 1 ? 's' : ''}`
      : `${filtered.length} match${filtered.length !== 1 ? 'es' : ''}`

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Users</h1>
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
        <Button size="sm" className={compactBtn} onClick={() => setCreateOpen(true)}>
          <Plus size={14} aria-hidden />
          <span className="sm:hidden">Add</span>
          <span className="hidden sm:inline">Add User</span>
        </Button>
      </div>

      {loading && users.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users"
          description="Add your first team member."
          actionLabel="Add User"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard
              index={0}
              label="Total"
              value={counts.all}
              icon={Users}
              selected={filter === 'all'}
              onClick={() => selectFilter('all')}
            />
            <StatCard
              index={1}
              label="Active"
              value={counts.active}
              icon={UserCheck}
              colorClass="text-success-600 bg-success-100"
              selected={filter === 'active'}
              onClick={() => selectFilter('active')}
            />
            <StatCard
              index={2}
              label="Inactive"
              value={counts.inactive}
              icon={UserX}
              colorClass="text-danger-600 bg-danger-100"
              selected={filter === 'inactive'}
              onClick={() => selectFilter('inactive')}
            />
            <StatCard
              index={3}
              label="Engineers"
              value={counts.engineer}
              icon={Wrench}
              colorClass="text-warning-600 bg-warning-100"
              selected={filter === 'engineer'}
              onClick={() => selectFilter('engineer')}
            />
            <StatCard
              index={4}
              label="QA"
              value={counts.qa}
              icon={Eye}
              colorClass="text-brand-600 bg-brand-100"
              selected={filter === 'qa'}
              onClick={() => selectFilter('qa')}
            />
            <StatCard
              index={5}
              label="Admins"
              value={counts.admin}
              icon={Shield}
              colorClass="text-ink-600 bg-ink-100"
              selected={filter === 'admin'}
              onClick={() => selectFilter('admin')}
            />
            <StatCard
              index={6}
              label="Viewers"
              value={counts.viewer}
              icon={Users}
              colorClass="text-ink-500 bg-ink-50"
              selected={filter === 'viewer'}
              onClick={() => selectFilter('viewer')}
              className="col-span-3 sm:col-span-1"
            />
          </div>

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
              placeholder="Search name, email, mobile…"
              className="w-full min-h-[40px] rounded-md border border-ink-200 bg-surface py-2 pl-9 pr-3 text-sm text-ink-950 outline-none transition-all duration-fast focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              style={{ fontSize: '16px' }}
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
                  description="No users for this filter."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setFilter('all')
                    setSearch('')
                  }}
                  className="py-10"
                />
              </motion.div>
            ) : (
              <motion.div
                key={`list-${filter}-${search}`}
                className="grid grid-cols-1 gap-2 md:grid-cols-2"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: 0.28, ease: easeOut }}
              >
                {filtered.map((u, i) => (
                  <motion.div
                    key={u.id}
                    layout={!reduced}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={stagger(Math.min(i, 12))}
                  >
                    <Card
                      className={cn(
                        'overflow-hidden p-0 shadow-xs',
                        !u.isActive && 'opacity-75'
                      )}
                    >
                      <div className="flex items-start gap-2.5 p-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                            u.isActive
                              ? 'bg-brand-100 text-brand-600'
                              : 'bg-ink-100 text-ink-400'
                          )}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-950">
                                {u.name}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-400">
                                <Mail size={10} className="shrink-0" aria-hidden />
                                {u.email}
                              </p>
                              {u.mobile ? (
                                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-400">
                                  <Phone size={10} className="shrink-0" aria-hidden />
                                  {u.mobile}
                                </p>
                              ) : null}
                            </div>

                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
                                  aria-label={`Actions for ${u.name}`}
                                >
                                  <MoreHorizontal size={16} aria-hidden />
                                </button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                  align="end"
                                  sideOffset={4}
                                  className="z-50 min-w-[160px] overflow-hidden rounded-lg border border-ink-100 bg-surface p-1 shadow-md"
                                >
                                  <DropdownMenu.Item
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-ink-700 outline-none data-[highlighted]:bg-ink-50"
                                    onSelect={() => openEdit(u)}
                                  >
                                    <Pencil size={13} aria-hidden /> Edit
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-ink-700 outline-none data-[highlighted]:bg-ink-50"
                                    onSelect={() => {
                                      setResetTarget(u)
                                      setNewPassword('')
                                      setConfirmPassword('')
                                      setResetOpen(true)
                                    }}
                                  >
                                    <KeyRound size={13} aria-hidden /> Reset password
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />
                                  <DropdownMenu.Item
                                    className={cn(
                                      'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium outline-none data-[highlighted]:bg-ink-50',
                                      u.isActive
                                        ? 'text-danger-600 data-[highlighted]:bg-danger-50'
                                        : 'text-success-600 data-[highlighted]:bg-success-50'
                                    )}
                                    onSelect={() => {
                                      setToggleTarget(u)
                                      setToggleOpen(true)
                                    }}
                                  >
                                    <Power size={13} aria-hidden />
                                    {u.isActive ? 'Deactivate' : 'Activate'}
                                  </DropdownMenu.Item>
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                                ROLE_COLOR[u.role] ?? 'bg-ink-100 text-ink-600'
                              )}
                            >
                              {ROLE_LABEL[u.role] ?? u.role}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                                u.isActive
                                  ? 'bg-success-100 text-success-700'
                                  : 'bg-danger-100 text-danger-600'
                              )}
                            >
                              {u.isActive ? (
                                <UserCheck size={10} aria-hidden />
                              ) : (
                                <UserX size={10} aria-hidden />
                              )}
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
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

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Add User">
        <div className="space-y-3">
          {(
            [
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Rahul Sharma' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'rahul@company.com' },
              { label: 'Mobile', key: 'mobile', type: 'tel', placeholder: '9876543210' },
              { label: 'Password', key: 'password', type: 'password', placeholder: 'Min. 6 characters' },
            ] as const
          ).map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className={fieldLabel}>{label}</label>
              <Input
                type={type}
                placeholder={placeholder}
                value={createForm[key]}
                onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className={fieldLabel}>Role</label>
            <Select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm({ ...createForm, role: e.target.value as UserRole })
              }
            >
              <option value="engineer">Engineer</option>
              <option value="qa">QA Reviewer</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <Button
            onClick={create}
            className="w-full"
            disabled={
              !createForm.name.trim() ||
              !createForm.email.trim() ||
              !createForm.password.trim()
            }
          >
            Create User
          </Button>
        </div>
      </Modal>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit User">
        <div className="space-y-3">
          {(
            [
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Mobile', key: 'mobile', type: 'tel' },
            ] as const
          ).map(({ label, key, type }) => (
            <div key={key}>
              <label className={fieldLabel}>{label}</label>
              <Input
                type={type}
                value={editForm[key]}
                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className={fieldLabel}>Role</label>
            <Select
              value={editForm.role}
              onChange={(e) =>
                setEditForm({ ...editForm, role: e.target.value as UserRole })
              }
            >
              <option value="engineer">Engineer</option>
              <option value="qa">QA Reviewer</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={saveEdit} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        title={toggleTarget?.isActive ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${toggleTarget?.isActive ? 'deactivate' : 'activate'} "${toggleTarget?.name}"?`}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.isActive ? 'danger' : 'primary'}
        onConfirm={confirmToggle}
      />

      <Modal
        open={resetOpen}
        onOpenChange={(v) => {
          if (!v) {
            setResetOpen(false)
            setNewPassword('')
            setConfirmPassword('')
          }
        }}
        title={`Reset Password — ${resetTarget?.name}`}
      >
        <p className="mb-3 text-[11px] text-ink-500">
          Set a new password for this user. They will need it on their next login.
        </p>
        <form onSubmit={handleResetPassword} className="space-y-3">
          <div>
            <label className={fieldLabel}>New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className={fieldLabel}>Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1 text-[11px] text-danger-600">Passwords do not match.</p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={savingReset}
              disabled={!newPassword || newPassword !== confirmPassword}
            >
              Reset Password
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
