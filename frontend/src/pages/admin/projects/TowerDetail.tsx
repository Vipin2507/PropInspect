import { useParams, useNavigate } from 'react-router-dom'
import { useFloors } from '../../../hooks/useFloors'
import { flatsApi, towersApi } from '../../../utils/api'
import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { ROUTES } from '../../../constants/routes'
import type { Flat, Tower } from '../../../types'
import { ArrowLeft, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TowerDetail() {
  const { id: projectId, towerId } = useParams()
  const navigate = useNavigate()
  const { floors } = useFloors(towerId || null)
  const [flats, setFlats] = useState<Flat[]>([])
  const [tower, setTower] = useState<Tower | null>(null)

  // Edit tower
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (towerId) {
      flatsApi.byTower(towerId).then(({ data }) => setFlats(data))
    }
    if (projectId) {
      towersApi.list(projectId).then(({ data }) => {
        const found = data.find((t) => t.id === towerId)
        if (found) setTower(found)
      })
    }
  }, [towerId, projectId])

  const openEdit = () => {
    if (tower) {
      setEditName(tower.name)
      setEditOpen(true)
    }
  }

  const saveEdit = async () => {
    if (!towerId) return
    await towersApi.update(towerId, { name: editName })
    toast.success('Tower renamed')
    setEditOpen(false)
    setTower((prev) => prev ? { ...prev, name: editName } : prev)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        {projectId && (
          <button onClick={() => navigate(ROUTES.ADMIN_PROJECT(projectId))} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
            <ArrowLeft size={16} /> Back to Project
          </button>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">{tower?.name || 'Tower Detail'}</h1>
          {tower && (
            <Button variant="ghost" size="sm" onClick={openEdit} title="Rename tower">
              <Pencil size={14} />
            </Button>
          )}
        </div>
        {tower && (
          <p className="mt-1 text-sm text-slate-500">
            {tower.totalFloors} floors × {tower.unitsPerFloor} units per floor
          </p>
        )}
      </div>

      {/* Floor breakdown */}
      <div className="space-y-4">
        {floors.map((floor) => {
          const floorFlats = flats.filter((f) => f.floorId === floor.id)
          return (
            <div key={floor.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-semibold text-slate-700">{floor.label}</h3>
              {floorFlats.length === 0 ? (
                <p className="text-sm text-slate-400">No flats on this floor</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {floorFlats.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="text-sm font-medium text-slate-900">{f.flatNumber}</div>
                      <Badge status={f.status} className="mt-1" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit Tower Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Rename Tower">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tower Name</label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveEdit} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
