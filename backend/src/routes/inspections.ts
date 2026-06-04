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
import { createNotification } from '../utils/notifications'
import { param } from '../utils/params'

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
  const responses = (
    db.prepare('SELECT * FROM responses WHERE inspection_id = ?').all(inspectionId) as Record<string, unknown>[]
  ).map((r) => rowToResponse(r, getImagesForResponse(r.id as string)))

  const insp = rowToInspection(row)
  const passCount = responses.filter((r) => r.status === 'pass').length
  const failCount = responses.filter((r) => r.status === 'fail').length
  const naCount = responses.filter((r) => r.status === 'na').length
  return {
    ...insp,
    responses,
    totalItems: responses.length,
    passCount,
    failCount,
    naCount,
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

  return loadInspection(inspectionId)!
}

router.get(
  '/flat/:flatId',
  requireRole('engineer', 'qa', 'admin'),
  asyncHandler(async (req, res) => {
    const db = getDB()
    const flatId = param(req, 'flatId')
    let row = db.prepare('SELECT * FROM inspections WHERE flat_id = ?').get(flatId) as Record<string, unknown>

    if (!row) {
      if (req.user!.role !== 'engineer') {
        res.status(404).json({ error: 'No inspection for this flat' })
        return
      }
      const assignment = db.prepare('SELECT engineer_id FROM assignments WHERE flat_id = ?').get(flatId) as { engineer_id: string }
      if (!assignment || assignment.engineer_id !== req.user!.id) {
        res.status(403).json({ error: 'Not assigned to this flat' })
        return
      }
      const inspection = createDraftInspection(flatId, req.user!.id)
      res.json(inspection)
      return
    }

    if (req.user!.role === 'engineer' && row.engineer_id !== req.user!.id) {
      res.status(403).json({ error: 'Not your inspection' })
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
    if (!inspection || inspection.engineer_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }
    if (!['draft', 'revision_required'].includes(inspection.status as string)) {
      res.status(400).json({ error: 'Cannot edit inspection in current status' })
      return
    }

    const update = db.prepare(
      `UPDATE responses SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ? AND inspection_id = ?`
    )

    for (const r of body.responses) {
      if (r.id && r.status) {
        update.run(r.status, r.remarks ?? '', r.id, inspectionId)
      }
    }

    db.prepare(`UPDATE inspections SET last_updated = datetime('now') WHERE id = ?`).run(inspectionId)
    db.prepare(`UPDATE flats SET status = 'in_progress' WHERE id = ? AND status = 'not_started'`).run(inspection.flat_id)

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

  for (const r of responses) {
    if (r.status === 'pending') {
      throw new AppError('All checklist items must be answered before submit', 400)
    }
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

  const assignment = db.prepare('SELECT qa_id FROM assignments WHERE flat_id = ?').get(inspection.flat_id) as { qa_id: string }
  if (assignment) {
    createNotification(
      assignment.qa_id,
      'inspection_submitted',
      'Inspection Submitted',
      'A flat inspection is ready for your review',
      inspection.flat_id as string
    )
  }

  return { inspection: loadInspection(inspectionId), snags }
}

router.post(
  '/:id/submit',
  requireRole('engineer'),
  asyncHandler(async (req, res) => {
    const inspectionId = param(req, 'id')
    const inspection = getDB().prepare('SELECT engineer_id FROM inspections WHERE id = ?').get(inspectionId) as { engineer_id: string }
    if (!inspection || inspection.engineer_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized' })
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
    const inspection = getDB().prepare('SELECT engineer_id FROM inspections WHERE id = ?').get(inspectionId) as { engineer_id: string }
    if (!inspection || inspection.engineer_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }
    const result = validateAndSubmit(inspectionId, true)
    res.json(result)
  })
)

export default router
