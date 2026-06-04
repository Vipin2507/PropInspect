import { useUsers } from '../../../hooks/useUsers'
import { Table, Th, Td } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useState } from 'react'
import { usersApi } from '../../../utils/api'
import type { User } from '../../../types'
import { Pencil, Plus, Power, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UserManagement() {
  const { users, loading, refresh } = useUsers()

  // Create state
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', mobile: '', password: '', role: 'engineer' })

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '', role: 'engineer' })

  // Toggle active state
  const [toggleOpen, setToggleOpen] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)

  const create = async () => {
    await usersApi.create(createForm)
    toast.success('User created')
    setCreateOpen(false)
    setCreateForm({ name: '', email: '', mobile: '', password: '', role: 'engineer' })
    refresh()
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setEditForm({ name: u.name, email: u.email, mobile: u.mobile, role: u.role })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editUser) return
    await usersApi.update(editUser.id, editForm)
    toast.success('User updated')
    setEditOpen(false)
    refresh()
  }

  const confirmToggle = async () => {
    if (!toggleTarget) return
    await usersApi.toggleActive(toggleTarget.id)
    toast.success(`User ${toggleTarget.isActive ? 'deactivated' : 'activated'}`)
    setToggleOpen(false)
    refresh()
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">{users.length} user{users.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Add User
        </Button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Mobile</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="group">
                  <Td>
                    <span className="font-medium text-slate-900">{u.name}</span>
                  </Td>
                  <Td>{u.email}</Td>
                  <Td>{u.mobile || '—'}</Td>
                  <Td>
                    <span className="inline-flex rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">
                      {u.role}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {u.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(u)}
                        title="Edit user"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setToggleTarget(u)
                          setToggleOpen(true)
                        }}
                        className={u.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}
                        title={u.isActive ? 'Deactivate user' : 'Activate user'}
                      >
                        <Power size={14} />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Create User">
        <p className="mb-4 text-sm text-slate-500">Add a new team member. They'll be able to log in with their email and password.</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name <span className="text-red-400">*</span></label>
            <Input placeholder="e.g. Rahul Sharma" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email <span className="text-red-400">*</span></label>
            <Input placeholder="e.g. rahul@company.com" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            <p className="mt-1 text-xs text-slate-400">Used for login</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mobile Number</label>
            <Input placeholder="e.g. +91 98765 43210" value={createForm.mobile} onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password <span className="text-red-400">*</span></label>
            <Input type="password" placeholder="Minimum 6 characters" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role <span className="text-red-400">*</span></label>
            <Select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
              <option value="engineer">Engineer — Performs inspections</option>
              <option value="qa">QA — Reviews inspections</option>
              <option value="admin">Admin — Full access</option>
              <option value="viewer">Viewer — Read-only access</option>
            </Select>
          </div>
          <Button onClick={create} className="w-full" disabled={!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()}>Create User</Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit User">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mobile</label>
            <Input value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <Select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="engineer">Engineer</option>
              <option value="qa">QA</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveEdit} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Toggle Active Confirmation */}
      <ConfirmDialog
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        title={toggleTarget?.isActive ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${toggleTarget?.isActive ? 'deactivate' : 'activate'} "${toggleTarget?.name}"? ${toggleTarget?.isActive ? 'They will no longer be able to log in.' : 'They will be able to log in again.'}`}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.isActive ? 'danger' : 'primary'}
        onConfirm={confirmToggle}
      />
    </div>
  )
}
