import { Router } from 'express'
import { z } from 'zod'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToResponse, rowToImage } from '../utils/mappers'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const inspectionId = req.query.inspectionId as string
    if (!inspectionId) {
      res.status(400).json({ error: 'inspectionId required' })
      return
    }
    const rows = getDB().prepare('SELECT * FROM responses WHERE inspection_id = ?').all(inspectionId) as Record<string, unknown>[]
    const responses = rows.map((r) => {
      const images = (
        getDB().prepare('SELECT * FROM images WHERE response_id = ?').all(r.id) as Record<string, unknown>[]
      ).map(rowToImage)
      return rowToResponse(r, images)
    })
    res.json(responses)
  })
)

router.patch(
  '/:id',
  requireRole('engineer'),
  asyncHandler(async (req, res) => {
    const body = z.object({ status: z.enum(['pass', 'fail', 'na', 'pending']).optional(), remarks: z.string().optional() }).parse(req.body)
    const db = getDB()
    const response = db.prepare('SELECT * FROM responses WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!response) {
      res.status(404).json({ error: 'Response not found' })
      return
    }
    const inspection = db.prepare('SELECT engineer_id, status FROM inspections WHERE id = ?').get(response.inspection_id) as { engineer_id: string; status: string }
    if (!inspection || inspection.engineer_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }
    if (!['draft', 'revision_required'].includes(inspection.status)) {
      res.status(400).json({ error: 'Cannot edit after submission' })
      return
    }
    db.prepare(`UPDATE responses SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`).run(
      body.status ?? response.status,
      body.remarks ?? response.remarks,
      req.params.id
    )
    const updated = db.prepare('SELECT * FROM responses WHERE id = ?').get(req.params.id) as Record<string, unknown>
    const images = db.prepare('SELECT * FROM images WHERE response_id = ?').all(req.params.id) as Record<string, unknown>[]
    res.json(rowToResponse(updated, images.map(rowToImage)))
  })
)

export default router
