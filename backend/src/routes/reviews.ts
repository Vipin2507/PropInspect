import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToInspection, rowToResponse, rowToImage, rowToSnag } from '../utils/mappers'
import { createNotification } from '../utils/notifications'

const router = Router()
router.use(authenticate)

router.get(
  '/queue',
  requireRole('qa'),
  asyncHandler(async (req, res) => {
    const filter = req.query.filter as string | undefined
    const db = getDB()
    let sql = `
      SELECT i.*, f.flat_number, t.name as tower_name, p.name as project_name, u.name as engineer_name
      FROM inspections i
      JOIN flats f ON f.id = i.flat_id
      JOIN towers t ON t.id = i.tower_id
      JOIN projects p ON p.id = i.project_id
      JOIN users u ON u.id = i.engineer_id
      JOIN assignments a ON a.flat_id = i.flat_id
      WHERE i.status = 'submitted' AND a.qa_id = ?
    `
    if (filter === 'today') {
      sql += ` AND date(i.submitted_at) = date('now')`
    } else if (filter === 'overdue') {
      sql += ` AND datetime(i.submitted_at) < datetime('now', '-2 days')`
    }
    sql += ` ORDER BY i.submitted_at DESC`
    const rows = db.prepare(sql).all(req.user!.id) as Record<string, unknown>[]
    res.json(
      rows.map((r) => ({
        inspectionId: r.id,
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        towerName: r.tower_name,
        projectName: r.project_name,
        engineerName: r.engineer_name,
        submittedAt: r.submitted_at,
        status: r.status,
      }))
    )
  })
)

router.get(
  '/history/list',
  requireRole('qa'),
  asyncHandler(async (req, res) => {
    const rows = getDB()
      .prepare(
        `SELECT r.*, f.flat_number FROM reviews r
         JOIN flats f ON f.id = r.flat_id
         WHERE r.qa_id = ? ORDER BY r.reviewed_at DESC LIMIT 50`
      )
      .all(req.user!.id) as Record<string, unknown>[]
    res.json(
      rows.map((r) => ({
        id: r.id,
        inspectionId: r.inspection_id,
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        qaId: r.qa_id,
        decision: r.decision,
        overallComments: r.overall_comments,
        itemComments: JSON.parse(r.item_comments as string),
        reviewedAt: r.reviewed_at,
      }))
    )
  })
)

router.get(
  '/:inspectionId',
  requireRole('qa', 'admin'),
  asyncHandler(async (req, res) => {
    const db = getDB()
    const row = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.inspectionId) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'Inspection not found' })
      return
    }
    const responses = (
      db.prepare('SELECT * FROM responses WHERE inspection_id = ?').all(req.params.inspectionId) as Record<string, unknown>[]
    ).map((r) => {
      const images = (db.prepare('SELECT * FROM images WHERE response_id = ?').all(r.id) as Record<string, unknown>[]).map(rowToImage)
      return rowToResponse(r, images)
    })
    const snags = (
      db.prepare('SELECT * FROM snags WHERE inspection_id = ?').all(req.params.inspectionId) as Record<string, unknown>[]
    ).map((s) => rowToSnag(s, [], []))
    const flat = db.prepare('SELECT flat_number FROM flats WHERE id = ?').get(row.flat_id) as { flat_number: string }
    const engineer = db.prepare('SELECT name FROM users WHERE id = ?').get(row.engineer_id) as { name: string }
    res.json({
      inspection: { ...rowToInspection(row), responses },
      snags,
      flatNumber: flat.flat_number,
      engineerName: engineer.name,
    })
  })
)

router.post(
  '/',
  requireRole('qa'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        inspectionId: z.string(),
        decision: z.enum(['approved', 'rejected', 'revision_required']),
        overallComments: z.string(),
        itemComments: z.record(z.string()),
      })
      .parse(req.body)

    const db = getDB()
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(body.inspectionId) as Record<string, unknown>
    if (!inspection || inspection.status !== 'submitted') {
      res.status(400).json({ error: 'Inspection not available for review' })
      return
    }

    const assignment = db.prepare('SELECT qa_id FROM assignments WHERE flat_id = ?').get(inspection.flat_id) as { qa_id: string }
    if (assignment.qa_id !== req.user!.id) {
      res.status(403).json({ error: 'Not assigned QA for this flat' })
      return
    }

    const reviewId = uuidv4()
    db.prepare(
      `INSERT INTO reviews (id, inspection_id, flat_id, qa_id, decision, overall_comments, item_comments)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(reviewId, body.inspectionId, inspection.flat_id, req.user!.id, body.decision, body.overallComments, JSON.stringify(body.itemComments))

    for (const [itemId, comment] of Object.entries(body.itemComments)) {
      db.prepare(
        `UPDATE responses SET qa_remarks = ? WHERE inspection_id = ? AND item_id = ?`
      ).run(comment, body.inspectionId, itemId)
    }

    let flatStatus = 'approved'
    let inspectionStatus: string = body.decision
    if (body.decision === 'approved') {
      const failCount = (
        db.prepare(`SELECT COUNT(*) as c FROM responses WHERE inspection_id = ? AND status = 'fail'`).get(body.inspectionId) as { c: number }
      ).c
      flatStatus = failCount > 0 ? 'desnagging' : 'approved'
      inspectionStatus = 'approved'
    } else if (body.decision === 'revision_required') {
      flatStatus = 'revision_required'
      inspectionStatus = 'revision_required'
    } else {
      flatStatus = 'rejected'
      inspectionStatus = 'rejected'
    }

    db.prepare(`UPDATE inspections SET status = ? WHERE id = ?`).run(inspectionStatus, body.inspectionId)
    db.prepare(`UPDATE flats SET status = ? WHERE id = ?`).run(flatStatus, inspection.flat_id)

    const notifType =
      body.decision === 'approved'
        ? 'inspection_approved'
        : body.decision === 'rejected'
          ? 'inspection_rejected'
          : 'revision_required'
    createNotification(
      inspection.engineer_id as string,
      notifType,
      `Inspection ${body.decision.replace('_', ' ')}`,
      body.overallComments,
      inspection.flat_id as string
    )

    res.status(201).json({
      id: reviewId,
      inspectionId: body.inspectionId,
      flatId: inspection.flat_id,
      qaId: req.user!.id,
      decision: body.decision,
      overallComments: body.overallComments,
      itemComments: body.itemComments,
      reviewedAt: new Date().toISOString(),
    })
  })
)

export default router
