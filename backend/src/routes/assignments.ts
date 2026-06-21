import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { createNotification } from '../utils/notifications'

const router = Router()
router.use(authenticate, requireRole('admin'))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { flatId, engineerId } = req.query
    const db = getDB()
    let rows: Record<string, unknown>[] = []
    if (flatId) {
      rows = db
        .prepare(
          `SELECT a.*, e.name as engineer_name, q.name as qa_name FROM assignments a
           LEFT JOIN users e ON e.id = a.engineer_id
           LEFT JOIN users q ON q.id = a.qa_id WHERE a.flat_id = ?`
        )
        .all(flatId) as Record<string, unknown>[]
    } else if (engineerId) {
      rows = db
        .prepare(
          `SELECT a.*, e.name as engineer_name, q.name as qa_name FROM assignments a
           LEFT JOIN users e ON e.id = a.engineer_id
           LEFT JOIN users q ON q.id = a.qa_id WHERE a.engineer_id = ?`
        )
        .all(engineerId) as Record<string, unknown>[]
    }
    res.json(rows.map(mapAssignment))
  })
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = z.object({ flatId: z.string(), engineerId: z.string(), qaId: z.string() }).parse(req.body)
    const db = getDB()
    const existing = db.prepare('SELECT id FROM assignments WHERE flat_id = ?').get(body.flatId)
    if (existing) {
      res.status(400).json({ error: 'Flat already has an assignment' })
      return
    }
    const id = uuidv4()
    db.prepare(
      `INSERT INTO assignments (id, flat_id, engineer_id, qa_id, assigned_by) VALUES (?, ?, ?, ?, ?)`
    ).run(id, body.flatId, body.engineerId, body.qaId, req.user!.id)

    const flat = db.prepare('SELECT flat_number FROM flats WHERE id = ?').get(body.flatId) as { flat_number: string }
    createNotification(body.engineerId, 'snag_assigned', 'Flat Assigned', `You have been assigned flat ${flat.flat_number}`, body.flatId)
    createNotification(body.qaId, 'snag_assigned', 'Flat Assigned for QA', `Flat ${flat.flat_number} assigned for review`, body.flatId)

    const row = db
      .prepare(
        `SELECT a.*, e.name as engineer_name, q.name as qa_name FROM assignments a
         LEFT JOIN users e ON e.id = a.engineer_id
         LEFT JOIN users q ON q.id = a.qa_id WHERE a.id = ?`
      )
      .get(id) as Record<string, unknown>
    res.status(201).json(mapAssignment(row))
  })
)

router.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    const body = z
      .object({ flatIds: z.array(z.string()).min(1), engineerId: z.string(), qaId: z.string() })
      .parse(req.body)
    const db = getDB()
    const created: Record<string, unknown>[] = []
    const skipped: string[] = []

    for (const flatId of body.flatIds) {
      const existing = db.prepare('SELECT id FROM assignments WHERE flat_id = ?').get(flatId)
      if (existing) {
        const flat = db.prepare('SELECT flat_number FROM flats WHERE id = ?').get(flatId) as { flat_number: string } | undefined
        skipped.push(flat?.flat_number || flatId)
        continue
      }
      const id = uuidv4()
      db.prepare(
        `INSERT INTO assignments (id, flat_id, engineer_id, qa_id, assigned_by) VALUES (?, ?, ?, ?, ?)`
      ).run(id, flatId, body.engineerId, body.qaId, req.user!.id)

      const flat = db.prepare('SELECT flat_number FROM flats WHERE id = ?').get(flatId) as { flat_number: string }
      createNotification(body.engineerId, 'snag_assigned', 'Flat Assigned', `You have been assigned flat ${flat.flat_number}`, flatId)
      createNotification(body.qaId, 'snag_assigned', 'Flat Assigned for QA', `Flat ${flat.flat_number} assigned for review`, flatId)

      const row = db
        .prepare(
          `SELECT a.*, e.name as engineer_name, q.name as qa_name FROM assignments a
           LEFT JOIN users e ON e.id = a.engineer_id
           LEFT JOIN users q ON q.id = a.qa_id WHERE a.id = ?`
        )
        .get(id) as Record<string, unknown>
      created.push(mapAssignment(row))
    }

    res.status(201).json({ created, skipped })
  })
)

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = z.object({ engineerId: z.string().optional(), qaId: z.string().optional() }).parse(req.body)
    const db = getDB()
    const row = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'Assignment not found' })
      return
    }
    db.prepare(`UPDATE assignments SET engineer_id = ?, qa_id = ? WHERE id = ?`).run(
      body.engineerId ?? row.engineer_id,
      body.qaId ?? row.qa_id,
      req.params.id
    )
    const updated = db
      .prepare(
        `SELECT a.*, e.name as engineer_name, q.name as qa_name FROM assignments a
         LEFT JOIN users e ON e.id = a.engineer_id
         LEFT JOIN users q ON q.id = a.qa_id WHERE a.id = ?`
      )
      .get(req.params.id) as Record<string, unknown>
    res.json(mapAssignment(updated))
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    getDB().prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  })
)

function mapAssignment(row: Record<string, unknown>) {
  return {
    id: row.id,
    flatId: row.flat_id,
    engineerId: row.engineer_id,
    qaId: row.qa_id,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    engineerName: row.engineer_name,
    qaName: row.qa_name,
  }
}

export default router
