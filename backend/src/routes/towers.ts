import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToTower, rowToFloor, rowToFlat } from '../utils/mappers'

const router = Router()
router.use(authenticate, requireRole('admin'))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const projectId = req.query.projectId as string
    if (!projectId) {
      res.status(400).json({ error: 'projectId required' })
      return
    }
    const rows = getDB().prepare('SELECT * FROM towers WHERE project_id = ?').all(projectId) as Record<string, unknown>[]
    res.json(rows.map(rowToTower))
  })
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        projectId: z.string(),
        name: z.string(),
        totalFloors: z.number().int().positive(),
        unitsPerFloor: z.number().int().positive(),
        unitPrefix: z.string(),
        startNumber: z.number().int(),
      })
      .parse(req.body)

    const db = getDB()
    const towerId = uuidv4()
    db.prepare(
      `INSERT INTO towers (id, project_id, name, total_floors, units_per_floor, unit_prefix, start_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(towerId, body.projectId, body.name, body.totalFloors, body.unitsPerFloor, body.unitPrefix, body.startNumber)

    const floors: ReturnType<typeof rowToFloor>[] = []
    const flats: ReturnType<typeof rowToFlat>[] = []

    for (let f = 1; f <= body.totalFloors; f++) {
      const floorId = uuidv4()
      const label = f === 0 ? 'Ground Floor' : `Floor ${f}`
      db.prepare(
        `INSERT INTO floors (id, tower_id, project_id, floor_number, label) VALUES (?, ?, ?, ?, ?)`
      ).run(floorId, towerId, body.projectId, f, label)

      const floorRow = db.prepare('SELECT * FROM floors WHERE id = ?').get(floorId) as Record<string, unknown>
      floors.push(rowToFloor(floorRow))

      for (let u = 0; u < body.unitsPerFloor; u++) {
        const flatId = uuidv4()
        const flatNumber = `${body.unitPrefix}${f * 100 + (u + 1)}`
        db.prepare(
          `INSERT INTO flats (id, tower_id, project_id, floor_id, flat_number, floor) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(flatId, towerId, body.projectId, floorId, flatNumber, f)
        const flatRow = db.prepare('SELECT * FROM flats WHERE id = ?').get(flatId) as Record<string, unknown>
        flats.push(rowToFlat(flatRow))
      }
    }

    const towerRow = db.prepare('SELECT * FROM towers WHERE id = ?').get(towerId) as Record<string, unknown>
    res.status(201).json({ tower: rowToTower(towerRow), floors, flats })
  })
)

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().optional(),
        totalFloors: z.number().optional(),
        unitsPerFloor: z.number().optional(),
        unitPrefix: z.string().optional(),
        startNumber: z.number().optional(),
      })
      .parse(req.body)
    const db = getDB()
    const row = db.prepare('SELECT * FROM towers WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'Tower not found' })
      return
    }
    db.prepare(
      `UPDATE towers SET name = ?, total_floors = ?, units_per_floor = ?, unit_prefix = ?, start_number = ? WHERE id = ?`
    ).run(
      body.name ?? row.name,
      body.totalFloors ?? row.total_floors,
      body.unitsPerFloor ?? row.units_per_floor,
      body.unitPrefix ?? row.unit_prefix,
      body.startNumber ?? row.start_number,
      req.params.id
    )
    const updated = db.prepare('SELECT * FROM towers WHERE id = ?').get(req.params.id) as Record<string, unknown>
    res.json(rowToTower(updated))
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    getDB().prepare('DELETE FROM towers WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  })
)

export default router
