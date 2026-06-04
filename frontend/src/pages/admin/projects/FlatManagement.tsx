import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { flatsApi, usersApi, assignmentsApi } from '../../../utils/api'
import { Table, Th, Td } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import type { Flat, User } from '../../../types'
import toast from 'react-hot-toast'

export default function FlatManagement() {
  const { id: projectId } = useParams()
  const [flats, setFlats] = useState<Flat[]>([])
  const [engineers, setEngineers] = useState<User[]>([])
  const [qas, setQas] = useState<User[]>([])
  const [assignForm, setAssignForm] = useState({ flatId: '', engineerId: '', qaId: '' })

  useEffect(() => {
    if (projectId) flatsApi.byProject(projectId).then(({ data }) => setFlats(data))
    usersApi.list('engineer').then(({ data }) => setEngineers(data))
    usersApi.list('qa').then(({ data }) => setQas(data))
  }, [projectId])

  const assign = async () => {
    await assignmentsApi.create(assignForm)
    toast.success('Assigned')
    if (projectId) flatsApi.byProject(projectId).then(({ data }) => setFlats(data))
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Flat Management</h1>
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold">Assign Engineer & QA</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Select value={assignForm.flatId} onChange={(e) => setAssignForm({ ...assignForm, flatId: e.target.value })}>
            <option value="">Select flat</option>
            {flats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.flatNumber}
              </option>
            ))}
          </Select>
          <Select value={assignForm.engineerId} onChange={(e) => setAssignForm({ ...assignForm, engineerId: e.target.value })}>
            <option value="">Engineer</option>
            {engineers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Select value={assignForm.qaId} onChange={(e) => setAssignForm({ ...assignForm, qaId: e.target.value })}>
            <option value="">QA</option>
            {qas.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Button onClick={assign}>Assign</Button>
        </div>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Flat</Th>
            <Th>Tower</Th>
            <Th>Floor</Th>
            <Th>Status</Th>
            <Th>Engineer</Th>
            <Th>QA</Th>
          </tr>
        </thead>
        <tbody>
          {flats.map((f) => (
            <tr key={f.id}>
              <Td>{f.flatNumber}</Td>
              <Td>{f.towerName}</Td>
              <Td>{f.floorLabel}</Td>
              <Td>{f.status}</Td>
              <Td>{f.assignment?.engineerName || '-'}</Td>
              <Td>{f.assignment?.qaName || '-'}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
