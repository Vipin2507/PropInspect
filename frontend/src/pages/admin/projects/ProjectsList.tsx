import { Link } from 'react-router-dom'
import { useProjects } from '../../../hooks/useProjects'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { useState } from 'react'
import { projectsApi } from '../../../utils/api'
import { ROUTES } from '../../../constants/routes'
import toast from 'react-hot-toast'

export default function ProjectsList() {
  const { projects, loading, refresh } = useProjects()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')

  const create = async () => {
    await projectsApi.create({ name, location })
    toast.success('Project created')
    setOpen(false)
    refresh()
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Projects</h1>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>+ New Project</Button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={ROUTES.ADMIN_PROJECT(p.id)}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md"
            >
              <h3 className="font-bold">{p.name}</h3>
              <p className="text-sm text-slate-500">{p.location}</p>
              <p className="mt-2 text-xs text-slate-400">{p.totalTowers} towers</p>
            </Link>
          ))}
        </div>
      )}
      <Modal open={open} onOpenChange={setOpen} title="Create Project">
        <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} className="mb-3" />
        <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="mb-3" />
        <Button onClick={create}>Create</Button>
      </Modal>
    </div>
  )
}
