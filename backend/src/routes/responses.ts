import { Router } from 'express'
import { z } from 'zod'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler, AppError } from '../middleware/errorHandler'
import { rowToResponse, rowToImage } from '../utils/mappers'
import { createNotification } from '../utils/notifications'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../constants/checklist'
import { logFlatHistory } from '../utils/flatHistory'
import { logEngineerFeedback, markFeedbackSeenForResponse } from '../utils/engineerFeedbackLog'
import {
  calcCompletionPct,
  calcCompletionPctFromDb,
  countPendingTasksFromDb,
  refreshCompletionNotified,
  syncInspectionResponses,
} from '../utils/inspectionTasks'
import { logTaskResponseChange } from '../utils/taskChangeLog'
import { param } from '../utils/params'

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

function getItemLabel(itemId: string, categoryId: string): string {
  const cat = DEFAULT_CHECKLIST_CATEGORIES.find((c) => c.id === categoryId)
  const item = cat?.items.find((i) => i.id === itemId)
  return item?.label ?? itemId
}

function getCategoryName(categoryId: string): string {
  const cat = DEFAULT_CHECKLIST_CATEGORIES.find((c) => c.id === categoryId)
  return cat?.name ?? categoryId
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

    logTaskResponseChange({
      flatId: inspection.flat_id,
      inspectionId: inspection.id,
      responseId: param(req, 'id'),
      itemId: response.item_id as string,
      categoryId: response.category_id as string,
      engineerId: req.user!.id,
      oldStatus: response.status as string,
      newStatus,
      oldRemarks: (response.remarks as string) ?? '',
      newRemarks: newRemarks ?? '',
    })

    db.prepare(
      `UPDATE responses SET status = ?, remarks = ?, qa_decision = NULL, qa_remarks = '', updated_at = datetime('now') WHERE id = ?`
    ).run(newStatus, newRemarks, req.params.id)

    markFeedbackSeenForResponse(param(req, 'id'), req.user!.id)

    // Keep flat status in sync
    db.prepare(
      `UPDATE flats SET status = 'in_progress' WHERE id = ? AND status = 'not_started'`
    ).run(inspection.flat_id)

    // Touch inspection last_updated
    db.prepare(`UPDATE inspections SET last_updated = datetime('now') WHERE id = ?`).run(inspection.id)

    // Req 3.6 — recalculate completion pct; fire flat_completion if newly 100%
    syncInspectionResponses(inspection.id)
    refreshCompletionNotified(inspection.id)
    maybeNotifyCompletion(inspection.id)
    const completionPct = calcCompletionPctFromDb(inspection.id)
    const pendingCount = countPendingTasksFromDb(inspection.id)

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
    const responseId = param(req, 'id')
    const response = db
      .prepare('SELECT * FROM responses WHERE id = ?')
      .get(responseId) as Record<string, unknown>
    if (!response) throw new AppError('Response not found', 404)

    const inspection = db
      .prepare(
        `SELECT i.id, i.status, i.flat_id, i.engineer_id
         FROM inspections i WHERE i.id = ?`
      )
      .get(response.inspection_id) as {
      id: string
      status: string
      flat_id: string
      engineer_id: string
    }
    if (!inspection) throw new AppError('Inspection not found', 404)

    const reviewableStatuses = ['draft', 'submitted', 'revision_required']
    if (!reviewableStatuses.includes(inspection.status)) {
      throw new AppError('Inspection is not available for per-task review', 400)
    }

    const oldDecision = (response.qa_decision as string) || ''
    const oldRemark = (response.qa_remarks as string) || ''

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
    ).run(body.qaDecision, body.qaRemark ?? '', responseId)

    const itemLabel = getItemLabel(response.item_id as string, response.category_id as string)
    const categoryName = getCategoryName(response.category_id as string)
    const qaUser = db
      .prepare('SELECT name FROM users WHERE id = ?')
      .get(req.user!.id) as { name: string } | undefined
    const decisionChanged =
      oldDecision !== body.qaDecision || (body.qaRemark ?? '').trim() !== oldRemark.trim()

    if (decisionChanged && body.qaDecision !== 'approved') {
      const isRevision = body.qaDecision === 'revision_required'
      const eventType = isRevision ? 'qa_task_revision' : 'qa_task_rejected'
      const title = isRevision ? `Sent for revision: ${itemLabel}` : `Task rejected: ${itemLabel}`

      logFlatHistory({
        flatId: inspection.flat_id,
        eventType,
        actorId: req.user!.id,
        title,
        description: body.qaRemark?.trim() || (isRevision ? 'QA requested a correction on this task.' : 'QA rejected this task.'),
        metadata: {
          responseId,
          itemId: response.item_id,
          categoryId: response.category_id,
          itemLabel,
          qaDecision: body.qaDecision,
          inspectionId: inspection.id,
        },
      })

      createNotification(
        inspection.engineer_id,
        isRevision ? 'qa_task_revision' : 'qa_task_rejected',
        isRevision ? 'Task sent for revision' : 'Task rejected by QA',
        `${itemLabel}: ${body.qaRemark?.trim() || (isRevision ? 'Please review and correct.' : 'See QA feedback.')}`,
        inspection.flat_id
      )

      logEngineerFeedback({
        flatId: inspection.flat_id,
        inspectionId: inspection.id,
        responseId,
        itemId: response.item_id as string,
        itemLabel,
        categoryName,
        engineerId: inspection.engineer_id,
        qaId: req.user!.id,
        qaName: qaUser?.name ?? 'QA',
        feedbackType: isRevision ? 'revision_required' : 'rejected',
        remark: body.qaRemark?.trim() ?? '',
      })
    } else if (decisionChanged && body.qaDecision === 'approved') {
      logFlatHistory({
        flatId: inspection.flat_id,
        eventType: 'qa_task_approved',
        actorId: req.user!.id,
        title: `Task approved: ${itemLabel}`,
        description: body.qaRemark?.trim() || 'QA approved this task.',
        metadata: {
          responseId,
          itemId: response.item_id,
          itemLabel,
          qaDecision: 'approved',
          inspectionId: inspection.id,
        },
      })

      logEngineerFeedback({
        flatId: inspection.flat_id,
        inspectionId: inspection.id,
        responseId,
        itemId: response.item_id as string,
        itemLabel,
        categoryName,
        engineerId: inspection.engineer_id,
        qaId: req.user!.id,
        qaName: qaUser?.name ?? 'QA',
        feedbackType: 'approved',
        remark: body.qaRemark?.trim() ?? '',
      })
    }

    const updated = db
      .prepare('SELECT * FROM responses WHERE id = ?')
      .get(responseId as string) as Record<string, unknown>
    res.json(rowToResponse(updated, getImagesForResponse(responseId)))
  })
)

export { calcCompletionPct } from '../utils/inspectionTasks'

export default router
