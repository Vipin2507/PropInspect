import { Router } from 'express'
import { z } from 'zod'
import { getDB, utcTs } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToFlat } from '../utils/mappers'
import { calcCompletionPct } from './responses'

const router = Router()
router.use(authenticate)

/**
 * GET /flats/checker
 * Req 5 — Checker flat progress view.
 * Returns flats in submitted/reviewed statuses with completionPct, sorted by submittedAt DESC.
 */
router.get(
  '/checker',
  requireRole('qa', 'admin'),
  asyncHandler(async (req, res) => {
    const { projectId, towerId } = req.query
    const db = getDB()

    let sql = `
      SELECT
        f.id, f.flat_number, f.status, f.tower_id, f.project_id, f.floor_id, f.floor, f.created_at,
        t.name  AS tower_name,
        fl.label AS floor_label,
        i.id    AS inspection_id,
        i.submitted_at,
        u.name  AS engineer_name
      FROM flats f
      LEFT JOIN towers t  ON t.id  = f.tower_id
      LEFT JOIN floors fl ON fl.id = f.floor_id
      LEFT JOIN inspections i ON i.flat_id = f.id
      LEFT JOIN users u   ON u.id  = i.engineer_id
      WHERE f.status IN ('submitted','approved','rejected','revision_required','desnagging','handed_over')
    `
    const params: unknown[] = []

    if (towerId) {
      sql += ` AND f.tower_id = ?`
      params.push(towerId)
    } else if (projectId) {
      sql += ` AND f.project_id = ?`
      params.push(projectId)
    }

    sql += ` ORDER BY i.submitted_at DESC NULLS LAST`

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]

    const result = rows.map((row) => {
      const inspectionId = row.inspection_id as string | undefined
      const completionPct = inspectionId ? calcCompletionPct(inspectionId) : 0
      return {
        id: row.id,
        flatNumber: row.flat_number,
        status: row.status,
        towerId: row.tower_id,
        projectId: row.project_id,
        floorId: row.floor_id,
        floor: row.floor,
        towerName: row.tower_name,
        floorLabel: row.floor_label,
        inspectionId: inspectionId || null,
        engineerName: row.engineer_name || null,
        submittedAt: utcTs(row.submitted_at),
        completionPct,
        createdAt: utcTs(row.created_at),
      }
    })

    res.json(result)
  })
)

router.get(
  '/',
  asyncHandler(async (req, res) => {    const { towerId, projectId } = req.query
    const db = getDB()
    let rows: Record<string, unknown>[] = []

    if (towerId) {
      rows = db.prepare('SELECT * FROM flats WHERE tower_id = ? ORDER BY flat_number').all(towerId) as Record<string, unknown>[]
    } else if (projectId) {
      rows = db.prepare('SELECT * FROM flats WHERE project_id = ? ORDER BY flat_number').all(projectId) as Record<string, unknown>[]
    } else {
      res.status(400).json({ error: 'towerId or projectId required' })
      return
    }

    const role = req.user!.role

    // Checker (QA) can only see flats that have been submitted for review or are in a reviewed state
    if (role === 'qa') {
      rows = rows.filter((row) => {
        const status = row.status as string
        return ['submitted', 'approved', 'rejected', 'revision_required', 'desnagging', 'handed_over'].includes(status)
      })
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
    // QA can only see flats that have been submitted for review or are in a reviewed state
    if (req.user!.role === 'qa') {
      const status = row.status as string
      if (!['submitted', 'approved', 'rejected', 'revision_required', 'desnagging', 'handed_over'].includes(status)) {
        res.status(403).json({ error: 'Flat has not been submitted for review' })
        return
      }
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
          'rejected', 'revision_required', 'desnagging', 'handed_over',
        ]),
      })
      .parse(req.body)
    getDB().prepare('UPDATE flats SET status = ? WHERE id = ?').run(status, req.params.id)
    const row = getDB().prepare('SELECT * FROM flats WHERE id = ?').get(req.params.id) as Record<string, unknown>
    res.json(enrichFlat(row))
  })
)

// Dedicated handover endpoint — accessible by admin and qa
router.post(
  '/:id/handover',
  requireRole('admin', 'qa'),
  asyncHandler(async (req, res) => {
    const db = getDB()
    const flat = db.prepare('SELECT * FROM flats WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!flat) {
      res.status(404).json({ error: 'Flat not found' })
      return
    }
    // Can only hand over an approved or desnagging flat
    if (!['approved', 'desnagging'].includes(flat.status as string)) {
      res.status(400).json({ error: 'Flat must be approved or desnagging before handover' })
      return
    }
    db.prepare(`UPDATE flats SET status = 'handed_over' WHERE id = ?`).run(req.params.id)
    const updated = db.prepare('SELECT * FROM flats WHERE id = ?').get(req.params.id) as Record<string, unknown>
    res.json(enrichFlat(updated))
  })
)

function enrichFlat(row: Record<string, unknown>) {
  const db = getDB()
  const tower = db.prepare('SELECT name FROM towers WHERE id = ?').get(row.tower_id) as { name: string } | undefined
  const floor = db.prepare('SELECT label FROM floors WHERE id = ?').get(row.floor_id) as { label: string } | undefined
  const inspection = db.prepare(
    `SELECT i.id, i.status, i.engineer_id, i.submitted_at, i.last_updated, u.name as engineer_name
     FROM inspections i
     LEFT JOIN users u ON u.id = i.engineer_id
     WHERE i.flat_id = ?`
  ).get(row.id) as { id: string; status: string; engineer_id: string; engineer_name: string; submitted_at: string; last_updated: string } | undefined

  const lastReview = db.prepare(
    `SELECT r.qa_id, r.decision, r.reviewed_at, u.name as reviewer_name
     FROM reviews r
     LEFT JOIN users u ON u.id = r.qa_id
     WHERE r.flat_id = ?
     ORDER BY r.reviewed_at DESC LIMIT 1`
  ).get(row.id) as { qa_id: string; decision: string; reviewed_at: string; reviewer_name: string } | undefined

  return {
    ...rowToFlat(row),
    towerName: tower?.name,
    floorLabel: floor?.label,
    inspection: inspection
      ? {
          id: inspection.id,
          status: inspection.status,
          engineerId: inspection.engineer_id,
          engineerName: inspection.engineer_name,
          submittedAt: utcTs(inspection.submitted_at),
          lastUpdated: utcTs(inspection.last_updated),
        }
      : null,
    lastReview: lastReview
      ? {
          qaId: lastReview.qa_id,
          reviewerName: lastReview.reviewer_name,
          decision: lastReview.decision,
          reviewedAt: utcTs(lastReview.reviewed_at),
        }
      : null,
    // engineerName at flat level for admin monitoring — pulled from inspection
    engineerName: inspection?.engineer_name ?? null,
    completionPct: inspection ? calcCompletionPct(inspection.id) : 0,
  }
}

export default router
