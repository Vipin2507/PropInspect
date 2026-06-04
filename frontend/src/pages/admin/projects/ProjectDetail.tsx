import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { projectsApi } from '../../../utils/api'
import { useTowers } from '../../../hooks/useTowers'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { ROUTES } from '../../../constants/routes'
import type { Project } from '../../../types'
import toast from 'react-hot-toast'

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const { towers, loading } = useTowers(id || null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: 'Tower A', totalFloors: 3, unitsPerFloor: 5, unitPrefix: 'A-', startNumber: 101 })

  useEffect(() => {
    if (id) projectsApi.list().then(({ data }) => setProject(data.find((p) => p.id === id) || null))
  }, [id])

  const addTower = async () => {
    if (!id) return
    await import('../../../utils/api').then(({ towersApi }) =>
      towersApi.create({ projectId: id, ...form })
    )
    toast.success('Tower created with flats')
    setOpen(false)
    window.location.reload()
  }

  if (!project) return <p>Loading...</p>

  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">{project.name}</h1>
      <p className="text-slate-500">{project.location}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Button onClick={() => setOpen(true)}>+ Add Tower</Button>
        <Link to={ROUTES.ADMIN_FLATS(id!)}>
          <Button variant="outline">Manage Flats</Button>
        </Link>
      </div>
      <h2 className="mb-3 mt-6 font-semibold">Towers</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-2">
          {towers.map((t) => (
            <Link
              key={t.id}
              to={ROUTES.ADMIN_TOWER(id!, t.id)}
              className="block rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm"
            >
              {t.name} — {t.totalFloors} floors × {t.unitsPerFloor} units
            </Link>
          ))}
        </div>
      )}
      <Modal open={open} onOpenChange={setOpen} title="Add Tower">
        <div className="space-y-3">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tower name" />
          <Input type="number" value={form.totalFloors} onChange={(e) => setForm({ ...form, totalFloors: +e.target.value })} />
          <Input type="number" value={form.unitsPerFloor} onChange={(e) => setForm({ ...form, unitsPerFloor: +e.target.value })} />
          <Input value={form.unitPrefix} onChange={(e) => setForm({ ...form, unitPrefix: e.target.value })} />
          <Button onClick={addTower}>Create Tower & Flats</Button>
        </div>
      </Modal>
    </div>
  )
}
