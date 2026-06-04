import { Router } from 'express'
import { z } from 'zod'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToFlat } from '../utils/mappers'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { towerId, engineerId, projectId } = req.query
    const db = getDB()
    let rows: Record<string, unknown>[] = []

    if (engineerId) {
      rows = db
        .prepare(
          `SELECT f.* FROM flats f
           JOIN assignments a ON a.flat_id = f.id
           WHERE a.engineer_id = ?
           ORDER BY f.flat_number`
        )
        .all(engineerId) as Record<string, unknown>[]
    } else if (towerId) {
      rows = db.prepare('SELECT * FROM flats WHERE tower_id = ? ORDER BY flat_number').all(towerId) as Record<string, unknown>[]
    } else if (projectId) {
      rows = db.prepare('SELECT * FROM flats WHERE project_id = ? ORDER BY flat_number').all(projectId) as Record<string, unknown>[]
    } else {
      res.status(400).json({ error: 'towerId, engineerId, or projectId required' })
      return
    }

    const flats = rows.map((row) => enrichFlat(row))
    res.json(flats)
  })
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = getDB().prepare('SELECT * FROM flats WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'Flat not found' })
      return
    }
    res.json(enrichFlat(row))
  })
)

router.patch(
  '/:id/status',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { status } = z
      .object({
        status: z.enum([
          'not_started', 'in_progress', 'submitted', 'approved',
          'rejected', 'revision_required', 'desnagging',
        ]),
      })
      .parse(req.body)
    getDB().prepare('UPDATE flats SET status = ? WHERE id = ?').run(status, req.params.id)
    const row = getDB().prepare('SELECT * FROM flats WHERE id = ?').get(req.params.id) as Record<string, unknown>
    res.json(enrichFlat(row))
  })
)

function enrichFlat(row: Record<string, unknown>) {
  const db = getDB()
  const assignment = db
    .prepare(
      `SELECT a.*, e.name as engineer_name, q.name as qa_name
       FROM assignments a
       LEFT JOIN users e ON e.id = a.engineer_id
       LEFT JOIN users q ON q.id = a.qa_id
       WHERE a.flat_id = ?`
    )
    .get(row.id) as Record<string, unknown> | undefined

  const tower = db.prepare('SELECT name FROM towers WHERE id = ?').get(row.tower_id) as { name: string } | undefined
  const floor = db.prepare('SELECT label FROM floors WHERE id = ?').get(row.floor_id) as { label: string } | undefined
  const inspection = db.prepare('SELECT id, status FROM inspections WHERE flat_id = ?').get(row.id) as { id: string; status: string } | undefined

  return {
    ...rowToFlat(row),
    towerName: tower?.name,
    floorLabel: floor?.label,
    assignment: assignment
      ? {
          id: assignment.id,
          flatId: assignment.flat_id,
          engineerId: assignment.engineer_id,
          qaId: assignment.qa_id,
          engineerName: assignment.engineer_name,
          qaName: assignment.qa_name,
          assignedAt: assignment.assigned_at,
        }
      : null,
    inspection: inspection || null,
  }
}

export default router
