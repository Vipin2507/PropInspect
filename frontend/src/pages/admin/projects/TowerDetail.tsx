import { useParams } from 'react-router-dom'
import { useFloors } from '../../../hooks/useFloors'
import { flatsApi } from '../../../utils/api'
import { useEffect, useState } from 'react'
import type { Flat } from '../../../types'

export default function TowerDetail() {
  const { towerId } = useParams()
  const { floors } = useFloors(towerId || null)
  const [flats, setFlats] = useState<Flat[]>([])

  useEffect(() => {
    if (towerId) flatsApi.byTower(towerId).then(({ data }) => setFlats(data))
  }, [towerId])

  return (
    <div>
      <h1 className="text-2xl font-bold">Tower Detail</h1>
      <div className="mt-4 space-y-4">
        {floors.map((floor) => (
          <div key={floor.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold">{floor.label}</h3>
            <ul className="mt-2 text-sm text-slate-600">
              {flats
                .filter((f) => f.floorId === floor.id)
                .map((f) => (
                  <li key={f.id}>
                    {f.flatNumber} — {f.status}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
