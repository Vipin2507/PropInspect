import { useUsers } from '../../../hooks/useUsers'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Spinner } from '../../../components/ui/Spinner'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useState } from 'react'
import { usersApi } from '../../../utils/api'
import type { User } from '../../../types'
import { Pencil, Plus, Power, UserCheck, UserX, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UserManagement() {
  const { users, loading, refresh } = useUsers()
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', mobile: '', password: '', role: 'engineer' })
  const [editOpen, setEditOpen]     = useState(false)
  const [editUser, setEditUser]     = useState<User | null>(null)
  const [editForm, setEditForm]     = useState({ name: '', email: '', mobile: '', role: 'engineer' })
  const [toggleOpen, setToggleOpen]     = useState(false)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  // Reset password state
  const [resetOpen, setResetOpen]     = useState(false)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingReset, setSavingReset] = useState(false)

  const create = async () => {
    try {
      await usersApi.create(createForm)
      toast.success('User created')
      setCreateOpen(false)
      setCreateForm({ name: '', email: '', mobile: '', password: '', role: 'engineer' })
      refresh()
    } catch { toast.error('Failed to create user') }
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
    } catch { toast.error('Failed to update user') }
  }

  const confirmToggle = async () => {
    if (!toggleTarget) return
    try {
      await usersApi.toggleActive(toggleTarget.id)
      toast.success(`User ${toggleTarget.isActive ? 'deactivated' : 'activated'}`)
      setToggleOpen(false)
      refresh()
    } catch { toast.error('Failed to update user') }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return }
    setSavingReset(true)
    try {
      await usersApi.resetPassword(resetTarget.id, newPassword)
      toast.success(`Password reset for ${resetTarget.name}.`)
      setResetOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch { toast.error('Failed to reset password.') }
    finally { setSavingReset(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Users</h1>
          <p className="text-sm text-slate-500">{users.length} member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} aria-hidden="true" /> Add User
        </Button>
      </div>

      {loading && users.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="No Users" description="Add your first team member." />
      ) : (
        /* Card list — much better on mobile than a table */
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{u.name}</p>
                  <p className="truncate text-sm text-slate-500">{u.email}</p>
                  {u.mobile && <p className="text-sm text-slate-500">{u.mobile}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                    {u.role}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {u.isActive ? <UserCheck size={11} aria-hidden="true" /> : <UserX size={11} aria-hidden="true" />}
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                {/* Top row: Edit + Reset Pass */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(u)}>
                    <Pencil size={14} aria-hidden="true" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-primary"
                    onClick={() => { setResetTarget(u); setNewPassword(''); setConfirmPassword(''); setResetOpen(true) }}
                  >
                    <KeyRound size={14} aria-hidden="true" /> Reset Pass
                  </Button>
                </div>
                {/* Full-width Activate / Deactivate below */}
                <Button
                  variant={u.isActive ? 'danger' : 'outline'}
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => { setToggleTarget(u); setToggleOpen(true) }}
                >
                  <Power size={14} aria-hidden="true" />
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Add User">
        <div className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Rahul Sharma' },
            { label: 'Email',     key: 'email', type: 'email', placeholder: 'rahul@company.com' },
            { label: 'Mobile',   key: 'mobile', type: 'tel',   placeholder: '9876543210' },
            { label: 'Password', key: 'password', type: 'password', placeholder: 'Min. 6 characters' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
              <Input
                type={type}
                placeholder={placeholder}
                value={(createForm as any)[key]}
                onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
            <Select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
              <option value="engineer">Engineer</option>
              <option value="qa">QA Reviewer</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <Button
            onClick={create}
            className="w-full"
            disabled={!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()}
          >
            Create User
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit User">
        <div className="space-y-4">
          {[
            { label: 'Name',   key: 'name',   type: 'text' },
            { label: 'Email',  key: 'email',  type: 'email' },
            { label: 'Mobile', key: 'mobile', type: 'tel' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
              <Input
                type={type}
                value={(editForm as any)[key]}
                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
            <Select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="engineer">Engineer</option>
              <option value="qa">QA Reviewer</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveEdit} className="flex-1">Save Changes</Button>
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

      {/* Reset Password Modal */}
      <Modal open={resetOpen} onOpenChange={(v) => { if (!v) { setResetOpen(false); setNewPassword(''); setConfirmPassword('') } }} title={`Reset Password — ${resetTarget?.name}`}>
        <p className="mb-4 text-sm text-slate-500">
          Set a new password for this user. They will need to use it on their next login.
        </p>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
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
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1.5 text-sm text-fail">Passwords do not match.</p>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)} className="flex-1">
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
    </div>
  )
}
