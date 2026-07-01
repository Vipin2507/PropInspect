import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler, AppError } from '../middleware/errorHandler'
import { rowToInspection, rowToResponse, rowToSnag, rowToImage } from '../utils/mappers'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../constants/checklist'
import { getItemMandatoryImage } from '../constants/checklist'
import { createNotification, createNotifications } from '../utils/notifications'
import { logFlatHistory } from '../utils/flatHistory'
import { param } from '../utils/params'
import {
  calcCompletionPct,
  countCompletedTasks,
  countPendingTasks,
  getExpectedTaskCount,
  isInspectionFullyComplete,
  repairPartialSubmission,
  syncInspectionResponses,
} from '../utils/inspectionTasks'
import { logTaskResponseChange } from '../utils/taskChangeLog'
import { markFeedbackSeenForResponse } from '../utils/engineerFeedbackLog'

const router = Router()
router.use(authenticate)

function getImagesForResponse(responseId: string) {
  const rows = getDB()
    .prepare('SELECT * FROM images WHERE response_id = ?')
    .all(responseId) as Record<string, unknown>[]
  return rows.map(rowToImage)
}

function loadInspection(inspectionId: string) {
  const db = getDB()
  const row = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId) as Record<string, unknown>
  if (!row) return null

  syncInspectionResponses(inspectionId)
  repairPartialSubmission(inspectionId, row.flat_id as string)

  const responses = (
    db.prepare('SELECT * FROM responses WHERE inspection_id = ?').all(inspectionId) as Record<string, unknown>[]
  ).map((r) => rowToResponse(r, getImagesForResponse(r.id as string)))

  const insp = rowToInspection(row)
  const passCount = responses.filter((r) => r.status === 'pass').length
  const failCount = responses.filter((r) => r.status === 'fail').length
  const naCount = responses.filter((r) => r.status === 'na').length
  const expectedTotal = getExpectedTaskCount()
  const completedCount = countCompletedTasks(inspectionId)
  const pendingCount = expectedTotal - completedCount
  const completionPct = calcCompletionPct(inspectionId)
  return {
    ...insp,
    responses,
    totalItems: expectedTotal,
    completedCount,
    pendingCount,
    passCount,
    failCount,
    naCount,
    completionPct,
  }
}

function createDraftInspection(flatId: string, engineerId: string) {
  const db = getDB()
  const flat = db.prepare('SELECT * FROM flats WHERE id = ?').get(flatId) as Record<string, unknown>
  if (!flat) throw new AppError('Flat not found', 404)

  const template = db.prepare('SELECT id FROM checklist_templates WHERE is_default = 1 LIMIT 1').get() as { id: string }
  if (!template) throw new AppError('No default checklist template', 500)

  const inspectionId = uuidv4()
  db.prepare(
    `INSERT INTO inspections (id, flat_id, project_id, tower_id, floor_id, engineer_id, template_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(inspectionId, flatId, flat.project_id, flat.tower_id, flat.floor_id, engineerId, template.id)

  const insertResponse = db.prepare(
    `INSERT INTO responses (id, inspection_id, item_id, category_id, status) VALUES (?, ?, ?, ?, 'pending')`
  )

  for (const cat of DEFAULT_CHECKLIST_CATEGORIES) {
    for (const item of cat.items) {
      const responseId = `${inspectionId}_${item.id}`
      insertResponse.run(responseId, inspectionId, item.id, cat.id)
    }
  }

  logFlatHistory({
    flatId,
    eventType: 'inspection_started',
    actorId: engineerId,
    title: 'Inspection started',
    description: 'Snagging inspection checklist created for this flat.',
  })

  return loadInspection(inspectionId)!
}

router.get(
  '/flat/:flatId',
  requireRole('engineer', 'qa', 'admin'),
  asyncHandler(async (req, res) => {
    const db = getDB()
    const flatId = param(req, 'flatId')
    const role = req.user!.role

    // Verify the flat exists
    const flat = db.prepare('SELECT id FROM flats WHERE id = ?').get(flatId)
    if (!flat) {
      res.status(404).json({ error: 'Flat not found' })
      return
    }

    let row = db.prepare('SELECT * FROM inspections WHERE flat_id = ?').get(flatId) as Record<string, unknown>

    if (!row) {
      if (role !== 'engineer') {
        // QA/admin: no inspection yet means nothing to review
        res.status(404).json({ error: 'No inspection for this flat' })
        return
      }
      // Any engineer can start an inspection on any flat
      const inspection = createDraftInspection(flatId, req.user!.id)
      res.json(inspection)
      return
    }

    res.json(loadInspection(row.id as string))
  })
)

router.put(
  '/:id',
  requireRole('engineer'),
  asyncHandler(async (req, res) => {
    const body = z.object({ responses: z.array(z.record(z.unknown())) }).parse(req.body)
    const db = getDB()
    const inspectionId = param(req, 'id')
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId) as Record<string, unknown>
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' })
      return
    }
    if (!['draft', 'revision_required'].includes(inspection.status as string)) {
      res.status(400).json({ error: 'Cannot edit inspection in current status' })
      return
    }

    const update = db.prepare(
      `UPDATE responses SET status = ?, remarks = ?, qa_decision = NULL, qa_remarks = '', updated_at = datetime('now') WHERE id = ? AND inspection_id = ?`
    )

    for (const r of body.responses) {
      if (r.id && r.status) {
        const existing = db
          .prepare('SELECT * FROM responses WHERE id = ? AND inspection_id = ?')
          .get(r.id, inspectionId) as Record<string, unknown> | undefined
        if (!existing) continue

        const newStatus = r.status as string
        const newRemarks = (r.remarks as string) ?? ''

        logTaskResponseChange({
          flatId: inspection.flat_id as string,
          inspectionId,
          responseId: r.id as string,
          itemId: existing.item_id as string,
          categoryId: existing.category_id as string,
          engineerId: req.user!.id,
          oldStatus: existing.status as string,
          newStatus,
          oldRemarks: (existing.remarks as string) ?? '',
          newRemarks,
        })

        update.run(newStatus, newRemarks, r.id, inspectionId)
        markFeedbackSeenForResponse(r.id as string, req.user!.id)
      }
    }

    db.prepare(`UPDATE inspections SET last_updated = datetime('now') WHERE id = ?`).run(inspectionId)
    db.prepare(`UPDATE flats SET status = 'in_progress' WHERE id = ? AND status = 'not_started'`).run(inspection.flat_id)

    // Fire flat_completion notification the first time we hit 100%
    const insp100 = db.prepare('SELECT id, flat_id, engineer_id, completion_notified FROM inspections WHERE id = ?')
      .get(inspectionId) as { id: string; flat_id: string; engineer_id: string; completion_notified: number }
    if (insp100 && !insp100.completion_notified) {
      const pct = calcCompletionPct(inspectionId)
      if (pct === 100) {
        db.prepare(`UPDATE inspections SET completion_notified = 1 WHERE id = ?`).run(inspectionId)
        createNotification(
          insp100.engineer_id,
          'flat_completion',
          'Flat 100% Complete',
          'All checklist items are done — you can now submit for QA review.',
          insp100.flat_id
        )
      }
    }

    res.json(loadInspection(inspectionId))
  })
)

function validateAndSubmit(inspectionId: string, isResubmit: boolean) {
  const db = getDB()
  const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId) as Record<string, unknown>
  if (!inspection) throw new AppError('Inspection not found', 404)

  if (isResubmit && inspection.status !== 'revision_required') {
    throw new AppError('Can only resubmit after revision required', 400)
  }
  if (!isResubmit && !['draft', 'revision_required'].includes(inspection.status as string)) {
    throw new AppError('Inspection already submitted', 400)
  }

  const responses = db.prepare('SELECT * FROM responses WHERE inspection_id = ?').all(inspectionId) as Record<string, unknown>[]

  syncInspectionResponses(inspectionId)
  const pendingCount = countPendingTasks(inspectionId)
  if (pendingCount > 0) {
    throw new AppError(
      `Cannot submit: ${pendingCount} task${pendingCount === 1 ? '' : 's'} still pending. Complete all tasks to reach 100% before final submission.`,
      400
    )
  }
  if (!isInspectionFullyComplete(inspectionId)) {
    throw new AppError('Cannot submit until all checklist tasks are completed (100%).', 400)
  }

  // Fail items with mandatory images still require evidence before submit
  for (const r of responses) {
    if (r.status === 'fail') {
      const mandatory = getItemMandatoryImage(r.item_id as string)
      const imageCount = (
        db.prepare('SELECT COUNT(*) as c FROM images WHERE response_id = ?').get(r.id) as { c: number }
      ).c
      if (mandatory && imageCount === 0) {
        throw new AppError(`Fail item "${r.item_id}" requires at least one image`, 400)
      }
    }
  }

  const snags: ReturnType<typeof rowToSnag>[] = []
  for (const r of responses) {
    if (r.status === 'fail') {
      let snagId = r.snag_id as string | null
      if (!snagId) {
        snagId = uuidv4()
        const cat = DEFAULT_CHECKLIST_CATEGORIES.find((c) => c.id === r.category_id)
        const item = cat?.items.find((i) => i.id === r.item_id)
        db.prepare(
          `INSERT INTO snags (id, inspection_id, response_id, flat_id, project_id, category, item_label, description, severity)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'minor')`
        ).run(
          snagId,
          inspectionId,
          r.id,
          inspection.flat_id,
          inspection.project_id,
          cat?.name || r.category_id,
          item?.label || r.item_id,
          r.remarks || ''
        )
        db.prepare('UPDATE responses SET snag_id = ? WHERE id = ?').run(snagId, r.id)
      }
      const snagRow = db.prepare('SELECT * FROM snags WHERE id = ?').get(snagId) as Record<string, unknown>
      const beforeImages = db.prepare('SELECT * FROM images WHERE response_id = ?').all(r.id) as Record<string, unknown>[]
      snags.push(rowToSnag(snagRow, beforeImages.map(rowToImage), []))
    }
  }

  db.prepare(`UPDATE inspections SET status = 'submitted', submitted_at = datetime('now'), last_updated = datetime('now') WHERE id = ?`).run(inspectionId)
  db.prepare(`UPDATE flats SET status = 'submitted' WHERE id = ?`).run(inspection.flat_id)

  logFlatHistory({
    flatId: inspection.flat_id as string,
    eventType: isResubmit ? 'inspection_resubmitted' : 'inspection_submitted',
    actorId: inspection.engineer_id as string,
    title: isResubmit ? 'Resubmitted for QA review' : 'Submitted for QA review',
    description: isResubmit
      ? 'Engineer addressed revisions and sent the inspection back to QA.'
      : 'Inspection sent to QA for review.',
    metadata: { inspectionId },
  })

  // Req 4.4 — notify all QA users
  const qaUsers = db.prepare(`SELECT id FROM users WHERE role = 'qa' AND is_active = 1`).all() as { id: string }[]
  createNotifications(
    qaUsers.map((u) => u.id),
    'inspection_submitted',
    'Flat Ready for Review',
    `A flat inspection has been submitted and is ready for your review.`,
    inspection.flat_id as string
  )

  // Req 4.5 — notify all admin users
  const adminUsers = db.prepare(`SELECT id FROM users WHERE role = 'admin' AND is_active = 1`).all() as { id: string }[]
  createNotifications(
    adminUsers.map((u) => u.id),
    'inspection_submitted',
    'Flat Submitted',
    `A flat inspection has been submitted for QA review.`,
    inspection.flat_id as string
  )

  // Req 4.6 — notify the engineer
  createNotification(
    inspection.engineer_id as string,
    'inspection_submitted',
    'Inspection Submitted',
    'Your inspection has been successfully submitted for QA review.',
    inspection.flat_id as string
  )

  return { inspection: loadInspection(inspectionId), snags }
}

router.post(
  '/:id/submit',
  requireRole('engineer'),
  asyncHandler(async (req, res) => {
    const inspectionId = param(req, 'id')
    const inspection = getDB().prepare('SELECT id FROM inspections WHERE id = ?').get(inspectionId)
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' })
      return
    }
    const result = validateAndSubmit(inspectionId, false)
    res.json(result)
  })
)

router.post(
  '/:id/resubmit',
  requireRole('engineer'),
  asyncHandler(async (req, res) => {
    const inspectionId = param(req, 'id')
    const inspection = getDB().prepare('SELECT id FROM inspections WHERE id = ?').get(inspectionId)
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' })
      return
    }
    const result = validateAndSubmit(inspectionId, true)
    res.json(result)
  })
)

export default router
