import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToSnag, rowToImage } from '../utils/mappers'
import { createNotification } from '../utils/notifications'
import { param } from '../utils/params'

const router = Router()
router.use(authenticate)

function loadSnag(id: string) {
  const row = getDB().prepare('SELECT * FROM snags WHERE id = ?').get(id) as Record<string, unknown>
  if (!row) return null
  const db = getDB()
  const before = (db.prepare(`SELECT * FROM images WHERE snag_id = ? AND type = 'before'`).all(id) as Record<string, unknown>[]).map(rowToImage)
  const after = (db.prepare(`SELECT * FROM images WHERE snag_id = ? AND type = 'after'`).all(id) as Record<string, unknown>[]).map(rowToImage)
  const evidenceBefore = (db.prepare(`SELECT * FROM images WHERE response_id = ?`).all(row.response_id) as Record<string, unknown>[]).map(rowToImage)
  return rowToSnag(row, [...evidenceBefore, ...before], after)
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { inspectionId, flatId, projectId } = req.query
    const db = getDB()
    let rows: Record<string, unknown>[] = []
    if (inspectionId) rows = db.prepare('SELECT * FROM snags WHERE inspection_id = ?').all(inspectionId) as Record<string, unknown>[]
    else if (flatId) rows = db.prepare('SELECT * FROM snags WHERE flat_id = ?').all(flatId) as Record<string, unknown>[]
    else if (projectId) rows = db.prepare('SELECT * FROM snags WHERE project_id = ?').all(projectId) as Record<string, unknown>[]
    else {
      res.status(400).json({ error: 'inspectionId, flatId, or projectId required' })
      return
    }
    res.json(rows.map((r) => loadSnag(r.id as string)).filter(Boolean))
  })
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const snag = loadSnag(param(req, 'id'))
    if (!snag) {
      res.status(404).json({ error: 'Snag not found' })
      return
    }
    res.json(snag)
  })
)

router.post(
  '/',
  requireRole('engineer', 'admin'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        responseId: z.string(),
        inspectionId: z.string(),
        flatId: z.string(),
        projectId: z.string(),
        category: z.string(),
        itemLabel: z.string(),
        description: z.string(),
        severity: z.enum(['critical', 'major', 'minor']),
      })
      .parse(req.body)
    const id = uuidv4()
    getDB()
      .prepare(
        `INSERT INTO snags (id, inspection_id, response_id, flat_id, project_id, category, item_label, description, severity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, body.inspectionId, body.responseId, body.flatId, body.projectId, body.category, body.itemLabel, body.description, body.severity)
    getDB().prepare('UPDATE responses SET snag_id = ? WHERE id = ?').run(id, body.responseId)
    res.status(201).json(loadSnag(id))
  })
)

router.patch(
  '/:id',
  requireRole('qa', 'admin', 'engineer'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        status: z.enum(['open', 'assigned', 'in_rectification', 'rectified', 'verified', 'closed', 'rejected']).optional(),
        assignedTo: z.string().optional(),
        remarks: z.string().optional(),
      })
      .parse(req.body)
    const db = getDB()
    const row = db.prepare('SELECT * FROM snags WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'Snag not found' })
      return
    }
    db.prepare(
      `UPDATE snags SET status = ?, assigned_to = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(body.status ?? row.status, body.assignedTo ?? row.assigned_to, body.remarks ?? row.remarks, param(req, 'id'))
    res.json(loadSnag(param(req, 'id')))
  })
)

router.post(
  '/:id/rectify',
  requireRole('engineer'),
  asyncHandler(async (req, res) => {
    const body = z.object({ remarks: z.string(), afterImages: z.array(z.string()).optional() }).parse(req.body)
    const db = getDB()
    const snagId = param(req, 'id')
    db.prepare(
      `UPDATE snags SET status = 'rectified', remarks = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(body.remarks, snagId)

    if (body.afterImages) {
      for (const url of body.afterImages) {
        db.prepare(
          `INSERT INTO images (id, inspection_id, snag_id, type, url) 
           SELECT ?, inspection_id, ?, 'after', ? FROM snags WHERE id = ?`
        ).run(uuidv4(), snagId, url, snagId)
      }
    }

    const snag = db.prepare('SELECT flat_id, project_id FROM snags WHERE id = ?').get(snagId) as { flat_id: string }
    const assignment = db.prepare('SELECT qa_id FROM assignments WHERE flat_id = ?').get(snag.flat_id) as { qa_id: string }
    if (assignment) {
      createNotification(assignment.qa_id, 'snag_rectified', 'Snag Rectified', 'A snag has been marked rectified and needs verification', snagId)
    }

    res.json(loadSnag(snagId))
  })
)

router.post(
  '/:id/verify-close',
  requireRole('qa', 'admin'),
  asyncHandler(async (req, res) => {
    const body = z.object({ approved: z.boolean(), comments: z.string().optional() }).parse(req.body)
    const db = getDB()
    const snagId = param(req, 'id')
    if (body.approved) {
      db.prepare(
        `UPDATE snags SET status = 'closed', closed_at = datetime('now'), remarks = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(body.comments || '', snagId)
    } else {
      db.prepare(`UPDATE snags SET status = 'open', updated_at = datetime('now') WHERE id = ?`).run(snagId)
    }
    res.json(loadSnag(snagId))
  })
)

export default router
