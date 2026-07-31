import { useParams, useNavigate, Link } from 'react-router-dom'
import { useFloors } from '../../../hooks/useFloors'
import { flatsApi, towersApi } from '../../../utils/api'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { StatusBadge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { StatCard } from '../../../components/ui/StatCard'
import { Spinner } from '../../../components/ui/Spinner'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ROUTES } from '../../../constants/routes'
import { useMotionSafe } from '../../../hooks/useMotionSafe'
import { cn } from '../../../utils/cn'
import type { Flat, Tower } from '../../../types'
import { ArrowLeft, Pencil, Layers, Home, CheckCircle, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'

export default function TowerDetail() {
  const { id: projectId, towerId } = useParams()
  const navigate = useNavigate()
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const { floors, loading: floorsLoading } = useFloors(towerId || null)
  const [flats, setFlats] = useState<Flat[]>([])
  const [tower, setTower] = useState<Tower | null>(null)
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (!towerId || !projectId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { getDb } = await import('../../../utils/db')
      const db = await getDb()

      const cachedFlats = (await db.getAllFromIndex('flats', 'by-tower', towerId)) as unknown as Flat[]
      if (!cancelled && cachedFlats.length) setFlats(cachedFlats)

      const cachedTower = (await db.get('towers', towerId)) as unknown as Tower | undefined
      if (!cancelled && cachedTower) setTower(cachedTower)

      try {
        const { data: freshFlats } = await flatsApi.byTower(towerId)
        if (!cancelled) setFlats(freshFlats)
        const tx = db.transaction('flats', 'readwrite')
        for (const f of freshFlats) await tx.store.put(f as unknown as Record<string, unknown>)
        await tx.done
      } catch {
        /* keep cached */
      }

      try {
        const { data: towers } = await towersApi.list(projectId)
        const found = towers.find((t) => t.id === towerId)
        if (found && !cancelled) {
          setTower(found)
          await db.put('towers', found as unknown as Record<string, unknown>)
        }
      } catch {
        /* keep cached */
      }

      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [towerId, projectId])

  const sortedFloors = useMemo(
    () => [...floors].sort((a, b) => a.floorNumber - b.floorNumber),
    [floors]
  )

  const counts = useMemo(() => {
    const approved = flats.filter((f) => f.status === 'approved' || f.status === 'handed_over').length
    return {
      flats: flats.length,
      floors: sortedFloors.length || tower?.totalFloors || 0,
      done: approved,
    }
  }, [flats, sortedFloors.length, tower?.totalFloors])

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
    setTower((prev) => (prev ? { ...prev, name: editName } : prev))
  }

  if (loading && !tower) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      {projectId && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.ADMIN_PROJECT(projectId))}
          className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors duration-fast hover:text-brand-600 touch-manipulation"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Project
        </button>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-bold text-ink-950 md:text-xl">
            {tower?.name || 'Tower Detail'}
          </h1>
          <p className="mt-0.5 text-[11px] text-ink-400">
            {tower
              ? `${tower.totalFloors} floors · ${tower.unitsPerFloor} units/floor${
                  tower.unitPrefix ? ` · ${tower.unitPrefix}*` : ''
                }`
              : 'Loading…'}
          </p>
        </div>
        {tower && (
          <Button
            variant="outline"
            size="sm"
            className={cn(compactBtn, 'shrink-0')}
            onClick={openEdit}
          >
            <Pencil size={13} aria-hidden="true" />
            Rename
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard index={0} label="Floors" value={counts.floors} icon={Layers} />
        <StatCard
          index={1}
          label="Flats"
          value={counts.flats}
          icon={Home}
          colorClass="text-brand-600 bg-brand-100"
        />
        <StatCard
          index={2}
          label="Done"
          value={counts.done}
          icon={CheckCircle}
          colorClass="text-success-600 bg-success-100"
        />
      </div>

      {projectId && (
        <Link
          to={ROUTES.ADMIN_FLATS(projectId)}
          className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline touch-manipulation"
        >
          <Building2 size={13} aria-hidden="true" />
          Manage flats &amp; assignments
        </Link>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Floors</h2>
        <span className="text-[11px] tabular text-ink-400">{sortedFloors.length}</span>
      </div>

      {floorsLoading && sortedFloors.length === 0 ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : sortedFloors.length === 0 ? (
        <EmptyState
          title="No floors"
          description="Floors appear after the tower is created."
          className="py-10"
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {sortedFloors.map((floor, i) => {
              const floorFlats = flats
                .filter((f) => f.floorId === floor.id)
                .sort((a, b) => {
                  const aNum = parseInt(a.flatNumber.replace(/\D/g, ''), 10) || 0
                  const bNum = parseInt(b.flatNumber.replace(/\D/g, ''), 10) || 0
                  return aNum - bNum
                })

              return (
                <motion.div
                  key={floor.id}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={stagger(i)}
                >
                  <Card className="overflow-hidden p-3 shadow-xs">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink-950">{floor.label}</h3>
                      <span className="text-[11px] tabular text-ink-400">
                        {floorFlats.length} flat{floorFlats.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {floorFlats.length === 0 ? (
                      <p className="text-[11px] text-ink-400">No flats on this floor</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {floorFlats.map((f) => (
                          <div
                            key={f.id}
                            className="rounded-md border border-ink-100/80 bg-ink-50/40 px-2 py-2 text-center transition-colors duration-fast hover:border-brand-200 hover:bg-brand-50/50"
                          >
                            <div className="text-xs font-semibold text-ink-950">{f.flatNumber}</div>
                            <StatusBadge status={f.status} className="mt-1 !px-1.5 !py-0.5" />
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Rename Tower">
        <div className="space-y-3">
          <div>
            <label className={fieldLabel}>Tower Name</label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={saveEdit} className="flex-1" disabled={!editName.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
