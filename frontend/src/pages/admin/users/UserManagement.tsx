import { useUsers } from '../../../hooks/useUsers'
import { Table, Th, Td } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { useState } from 'react'
import { usersApi } from '../../../utils/api'
import toast from 'react-hot-toast'

export default function UserManagement() {
  const { users, loading, refresh } = useUsers()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', role: 'engineer' })

  const create = async () => {
    await usersApi.create(form)
    toast.success('User created')
    setOpen(false)
    refresh()
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">User Management</h1>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>+ Add User</Button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.name}</Td>
                <Td>{u.email}</Td>
                <Td className="capitalize">{u.role}</Td>
                <Td>
                  <Badge>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal open={open} onOpenChange={setOpen} title="Create User">
        <div className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="engineer">Engineer</option>
            <option value="qa">QA</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </Select>
          <Button onClick={create}>Create</Button>
        </div>
      </Modal>
    </div>
  )
}
