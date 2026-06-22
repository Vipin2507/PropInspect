import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDB, utcTs } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToInspection, rowToResponse, rowToImage, rowToSnag } from '../utils/mappers'
import { createNotification, createNotifications } from '../utils/notifications'
import { logFlatHistory } from '../utils/flatHistory'

const router = Router()
router.use(authenticate)

router.get(
  '/queue',
  requireRole('qa', 'admin'),
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
      WHERE i.status = 'submitted'
    `
    const params: unknown[] = []
    if (filter === 'today') {
      sql += ` AND date(i.submitted_at) = date('now')`
    } else if (filter === 'overdue') {
      sql += ` AND datetime(i.submitted_at) < datetime('now', '-2 days')`
    }
    sql += ` ORDER BY i.submitted_at DESC`
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
    res.json(
      rows.map((r) => ({
        inspectionId: r.id,
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        towerName: r.tower_name,
        projectName: r.project_name,
        engineerName: r.engineer_name,
        submittedAt: utcTs(r.submitted_at),
        status: r.status,
      }))
    )
  })
)

router.get(
  '/history/list',
  requireRole('qa', 'admin'),
  asyncHandler(async (req, res) => {
    const db = getDB()
    // Both QA and admin see all review history (with reviewer info for admin visibility)
    const rows = db.prepare(`
      SELECT r.*, f.flat_number, u.name as reviewer_name, ui.name as engineer_name, i.engineer_id
      FROM reviews r
      JOIN flats f ON f.id = r.flat_id
      JOIN users u ON u.id = r.qa_id
      JOIN inspections i ON i.id = r.inspection_id
      JOIN users ui ON ui.id = i.engineer_id
      ORDER BY r.reviewed_at DESC LIMIT 100
    `).all() as Record<string, unknown>[]
    res.json(
      rows.map((r) => ({
        id: r.id,
        inspectionId: r.inspection_id,
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        qaId: r.qa_id,
        reviewerName: r.reviewer_name,
        engineerId: r.engineer_id,
        engineerName: r.engineer_name,
        decision: r.decision,
        overallComments: r.overall_comments,
        itemComments: JSON.parse(r.item_comments as string),
        reviewedAt: utcTs(r.reviewed_at),
      }))
    )
  })
)

router.get(
  '/:inspectionId',
  requireRole('qa', 'admin', 'engineer'),
  asyncHandler(async (req, res) => {
    const db = getDB()
    const row = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.inspectionId) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'Inspection not found' })
      return
    }
    // Engineers can only see their own inspections
    if (req.user!.role === 'engineer' && row.engineer_id !== req.user!.id) {
      res.status(403).json({ error: 'Not your inspection' })
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
  requireRole('qa', 'admin'),
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
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' })
      return
    }
    if (inspection.status !== 'submitted') {
      res.status(400).json({
        error: `This inspection cannot be reviewed right now (status: ${inspection.status}). Pull to refresh and try again.`,
      })
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

    const reviewEventMap = {
      approved: 'review_approved',
      rejected: 'review_rejected',
      revision_required: 'review_revision_required',
    } as const
    const reviewTitleMap = {
      approved: 'Approved by QA',
      rejected: 'Rejected by QA',
      revision_required: 'Revision requested by QA',
    } as const

    logFlatHistory({
      flatId: inspection.flat_id as string,
      eventType: reviewEventMap[body.decision],
      actorId: req.user!.id,
      title: reviewTitleMap[body.decision],
      description: body.overallComments || `QA marked this flat as ${body.decision.replace(/_/g, ' ')}.`,
      metadata: {
        reviewId,
        inspectionId: body.inspectionId,
        decision: body.decision,
      },
    })

    const notifType =
      body.decision === 'approved'
        ? 'inspection_approved'
        : body.decision === 'rejected'
          ? 'inspection_rejected'
          : 'revision_required'

    // Build engineer notification message
    let engineerMessage = body.overallComments || `Your inspection has been ${body.decision.replace('_', ' ')}.`
    if (body.decision === 'revision_required') {
      // Req 8.5 — list tasks that need revision
      const revisionTasks = db
        .prepare(`SELECT item_id FROM responses WHERE inspection_id = ? AND qa_decision = 'revision_required'`)
        .all(body.inspectionId) as { item_id: string }[]
      if (revisionTasks.length > 0) {
        engineerMessage += ` Tasks requiring revision: ${revisionTasks.map((t) => t.item_id).join(', ')}.`
      }
    }

    // Notify the engineer
    createNotification(
      inspection.engineer_id as string,
      notifType,
      `Inspection ${body.decision.replace(/_/g, ' ')}`,
      engineerMessage,
      inspection.flat_id as string
    )

    // Notify all admin users about the review outcome
    const adminUsers = db
      .prepare(`SELECT id FROM users WHERE role = 'admin' AND is_active = 1`)
      .all() as { id: string }[]
    createNotifications(
      adminUsers.map((u) => u.id),
      notifType,
      `Inspection ${body.decision.replace(/_/g, ' ')}`,
      `A flat inspection has been ${body.decision.replace(/_/g, ' ')} by QA.`,
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
