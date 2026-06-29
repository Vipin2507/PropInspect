import { Router } from 'express'
import { z } from 'zod'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler, AppError } from '../middleware/errorHandler'
import { rowToResponse, rowToImage } from '../utils/mappers'
import { createNotification } from '../utils/notifications'
import {
  calcCompletionPct,
  countPendingTasks,
  refreshCompletionNotified,
} from '../utils/inspectionTasks'

const router = Router()
router.use(authenticate)

// ─── Helpers ────────────────────────────────────────────────────────────────

function getImagesForResponse(responseId: string) {
  return (
    getDB()
      .prepare('SELECT * FROM images WHERE response_id = ?')
      .all(responseId) as Record<string, unknown>[]
  ).map(rowToImage)
}

/**
 * Fire a flat_completion notification the first time an inspection reaches 100%.
 * Idempotent — guarded by the completion_notified column.
 */
function maybeNotifyCompletion(inspectionId: string): void {
  const db = getDB()
  const inspection = db
    .prepare('SELECT id, flat_id, engineer_id, completion_notified FROM inspections WHERE id = ?')
    .get(inspectionId) as { id: string; flat_id: string; engineer_id: string; completion_notified: number } | undefined
  if (!inspection || inspection.completion_notified) return

  const pct = calcCompletionPct(inspectionId)
  if (pct < 100) return

  db.prepare(`UPDATE inspections SET completion_notified = 1 WHERE id = ?`).run(inspectionId)

  createNotification(
    inspection.engineer_id,
    'flat_completion',
    'Flat 100% Complete',
    'All checklist items are done — you can now submit for QA review.',
    inspection.flat_id
  )
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/** GET /responses?inspectionId=... */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const inspectionId = req.query.inspectionId as string
    if (!inspectionId) {
      res.status(400).json({ error: 'inspectionId required' })
      return
    }
    const rows = getDB()
      .prepare('SELECT * FROM responses WHERE inspection_id = ?')
      .all(inspectionId) as Record<string, unknown>[]
    res.json(rows.map((r) => rowToResponse(r, getImagesForResponse(r.id as string))))
  })
)

/**
 * PATCH /responses/:id
 * Engineer single-task status update.
 * Req 1 (task status management) & Req 2 (reset / correction).
 */
router.patch(
  '/:id',
  requireRole('engineer'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        status: z.enum(['pass', 'fail', 'na', 'pending']).optional(),
        remarks: z.string().optional(),
      })
      .parse(req.body)

    const db = getDB()
    const response = db
      .prepare('SELECT * FROM responses WHERE id = ?')
      .get(req.params.id) as Record<string, unknown>
    if (!response) throw new AppError('Response not found', 404)

    const inspection = db
      .prepare('SELECT id, flat_id, engineer_id, status FROM inspections WHERE id = ?')
      .get(response.inspection_id) as { id: string; flat_id: string; engineer_id: string; status: string }
    if (!inspection) throw new AppError('Inspection not found', 404)

    // Only the assigned engineer may edit
    if (inspection.engineer_id !== req.user!.id) {
      throw new AppError('Not authorized', 403)
    }

    // Req 1.4 / 2.4 — inspection must be editable
    if (!['draft', 'revision_required'].includes(inspection.status)) {
      throw new AppError('Inspection is locked and cannot be edited in its current status', 400)
    }

    const newStatus = body.status ?? (response.status as string)
    let newRemarks = body.remarks ?? (response.remarks as string)

    // Req 1.3 — fail requires non-empty remarks
    if (newStatus === 'fail' && !newRemarks?.trim()) {
      throw new AppError('A remark is required when marking a task as Fail', 400)
    }

    // Req 2.1 — reset to pending clears remarks
    if (newStatus === 'pending') {
      newRemarks = ''
    }

    db.prepare(
      `UPDATE responses SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(newStatus, newRemarks, req.params.id)

    // Keep flat status in sync
    db.prepare(
      `UPDATE flats SET status = 'in_progress' WHERE id = ? AND status = 'not_started'`
    ).run(inspection.flat_id)

    // Touch inspection last_updated
    db.prepare(`UPDATE inspections SET last_updated = datetime('now') WHERE id = ?`).run(inspection.id)

    // Req 3.6 — recalculate completion pct; fire flat_completion if newly 100%
    refreshCompletionNotified(inspection.id)
    maybeNotifyCompletion(inspection.id)
    const completionPct = calcCompletionPct(inspection.id)
    const pendingCount = countPendingTasks(inspection.id)

    const updated = db
      .prepare('SELECT * FROM responses WHERE id = ?')
      .get(req.params.id as string) as Record<string, unknown>
    res.json({
      ...rowToResponse(updated, getImagesForResponse(req.params.id as string)),
      completionPct,
      pendingCount,
    })
  })
)

/**
 * PATCH /responses/:id/qa-decision
 * Checker per-task decision: approved | rejected | revision_required.
 * Req 6 (per-task review).
 */
router.patch(
  '/:id/qa-decision',
  requireRole('qa', 'admin'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        qaDecision: z.enum(['approved', 'rejected', 'revision_required']),
        qaRemark: z.string().optional(),
      })
      .parse(req.body)

    const db = getDB()
    const response = db
      .prepare('SELECT * FROM responses WHERE id = ?')
      .get(req.params.id) as Record<string, unknown>
    if (!response) throw new AppError('Response not found', 404)

    const inspection = db
      .prepare('SELECT id, status FROM inspections WHERE id = ?')
      .get(response.inspection_id) as { id: string; status: string }
    if (!inspection) throw new AppError('Inspection not found', 404)

    // Req 6.1 — inspection must be submitted
    if (inspection.status !== 'submitted') {
      throw new AppError('Inspection is not available for per-task review', 400)
    }

    // Req 6.3 — reject / revision requires non-empty remark
    if (
      ['rejected', 'revision_required'].includes(body.qaDecision) &&
      !body.qaRemark?.trim()
    ) {
      throw new AppError(
        'A QA remark is required when rejecting or requesting revision on a task',
        400
      )
    }

    db.prepare(
      `UPDATE responses SET qa_decision = ?, qa_remarks = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(body.qaDecision, body.qaRemark ?? '', req.params.id)

    const updated = db
      .prepare('SELECT * FROM responses WHERE id = ?')
      .get(req.params.id as string) as Record<string, unknown>
    res.json(rowToResponse(updated, getImagesForResponse(req.params.id as string)))
  })
)

export { calcCompletionPct } from '../utils/inspectionTasks'

export default router
