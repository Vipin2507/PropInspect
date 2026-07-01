import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToFlat } from '../utils/mappers'
import { validateAndSubmitFromSync } from '../services/syncService'
import { createNotification } from '../utils/notifications'
import { logTaskResponseChange } from '../utils/taskChangeLog'
import { markFeedbackSeenForResponse } from '../utils/engineerFeedbackLog'

const router = Router()
router.use(authenticate)

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads')

router.post(
  '/push',
  asyncHandler(async (req, res) => {
    const { changes } = z.object({ changes: z.array(z.record(z.unknown())) }).parse(req.body)
    let processed = 0
    let failed = 0
    const errors: string[] = []

    for (const change of changes) {
      try {
        const type = change.type as string
        const payload = change.payload as Record<string, unknown>
        const db = getDB()

        // ── 1. Save checklist responses ──────────────────────────────────
        if (type === 'save_inspection') {
          const inspectionId = payload.inspectionId as string
          const inspection = db
            .prepare('SELECT flat_id, engineer_id FROM inspections WHERE id = ?')
            .get(inspectionId) as { flat_id: string; engineer_id: string } | undefined
          const responses = payload.responses as Array<{ id: string; status?: string; remarks?: string }>
          for (const r of responses) {
            const existing = db
              .prepare('SELECT * FROM responses WHERE id = ?')
              .get(r.id) as Record<string, unknown> | undefined
            if (!existing || !inspection) continue

            const newStatus = r.status ?? 'pending'
            const newRemarks = r.remarks ?? ''

            logTaskResponseChange({
              flatId: inspection.flat_id,
              inspectionId,
              responseId: r.id,
              itemId: existing.item_id as string,
              categoryId: existing.category_id as string,
              engineerId: inspection.engineer_id,
              oldStatus: existing.status as string,
              newStatus,
              oldRemarks: (existing.remarks as string) ?? '',
              newRemarks,
            })

            db.prepare(`UPDATE responses SET status = ?, remarks = ?, qa_decision = NULL, qa_remarks = '', updated_at = datetime('now') WHERE id = ?`).run(
              newStatus,
              newRemarks,
              r.id
            )
            markFeedbackSeenForResponse(r.id, inspection.engineer_id)
          }
          db.prepare(`UPDATE inspections SET last_updated = datetime('now') WHERE id = ?`).run(inspectionId)
          processed++

        // ── 2. Submit / resubmit inspection ──────────────────────────────
        } else if (type === 'submit_inspection' || type === 'resubmit_inspection') {
          validateAndSubmitFromSync(payload.inspectionId as string, type === 'resubmit_inspection')
          processed++

        // ── 3. QA review decision (queued offline) ───────────────────────
        } else if (type === 'review_decision') {
          const {
            inspectionId,
            decision,
            overallComments = '',
            itemComments = {},
          } = payload as {
            inspectionId: string
            decision: string
            overallComments: string
            itemComments: Record<string, string>
          }

          const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId) as Record<string, unknown> | undefined
          if (!inspection) { errors.push(`Inspection ${inspectionId} not found`); failed++; continue }
          if (!['submitted', 'approved', 'revision_required', 'rejected'].includes(inspection.status as string)) {
            errors.push(`Inspection ${inspectionId} not in reviewable state`); failed++; continue
          }

          const reviewId = uuidv4()
          db.prepare(
            `INSERT OR IGNORE INTO reviews (id, inspection_id, flat_id, qa_id, decision, overall_comments, item_comments)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).run(reviewId, inspectionId, inspection.flat_id, req.user!.id, decision, overallComments, JSON.stringify(itemComments))

          // Apply item comments to responses
          for (const [itemId, comment] of Object.entries(itemComments)) {
            db.prepare(`UPDATE responses SET qa_remarks = ? WHERE inspection_id = ? AND item_id = ?`)
              .run(comment, inspectionId, itemId)
          }

          // Update flat + inspection status
          const decisionToInspStatus: Record<string, string> = {
            approved: 'approved',
            revision_required: 'revision_required',
            rejected: 'rejected',
          }
          const decisionToFlatStatus: Record<string, string> = {
            approved: 'approved',
            revision_required: 'revision_required',
            rejected: 'rejected',
          }
          const inspStatus = decisionToInspStatus[decision] ?? decision
          const flatStatus = decisionToFlatStatus[decision] ?? decision

          db.prepare(`UPDATE inspections SET status = ? WHERE id = ?`).run(inspStatus, inspectionId)
          db.prepare(`UPDATE flats SET status = ? WHERE id = ?`).run(flatStatus, inspection.flat_id)

          // Notify the engineer
          const notifType = decision === 'approved'
            ? 'inspection_approved'
            : decision === 'rejected' ? 'inspection_rejected' : 'revision_required'
          createNotification(
            inspection.engineer_id as string,
            notifType,
            `Inspection ${decision.replace('_', ' ')}`,
            overallComments,
            inspection.flat_id as string
          )
          processed++

        // ── 4. Upload image (base64 stored offline) ───────────────────────
        } else if (type === 'upload_image') {
          const {
            inspectionId,
            responseId,
            base64,
            type: imgType = 'evidence',
          } = payload as {
            inspectionId: string
            responseId?: string
            snagId?: string
            base64: string
            type?: string
          }

          if (!base64 || !inspectionId) { processed++; continue }

          // Decode base64 data URI → buffer
          const matches = base64.match(/^data:image\/\w+;base64,(.+)$/)
          if (!matches) { processed++; continue }
          const buffer = Buffer.from(matches[1], 'base64')

          const dir = path.join(UPLOADS_DIR, inspectionId)
          const thumbDir = path.join(dir, 'thumbs')
          fs.mkdirSync(thumbDir, { recursive: true })

          const fileId = uuidv4()
          const filename = `${fileId}.jpg`
          const filepath = path.join(dir, filename)
          const thumbpath = path.join(thumbDir, filename)

          await sharp(buffer).rotate().jpeg({ quality: 80 }).toFile(filepath)
          await sharp(filepath).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbpath)

          const url = `/uploads/${inspectionId}/${filename}`
          const thumbnailUrl = `/uploads/${inspectionId}/thumbs/${filename}`
          const id = uuidv4()

          db.prepare(
            `INSERT OR IGNORE INTO images (id, inspection_id, response_id, type, url, thumbnail_url, caption)
             VALUES (?, ?, ?, ?, ?, ?, '')`
          ).run(id, inspectionId, responseId || null, imgType, url, thumbnailUrl)

          processed++

        // ── 5. Update snag status/remarks ─────────────────────────────────
        } else if (type === 'update_snag') {
          const { snagId, changes: snagChanges } = payload as {
            snagId: string
            changes: { status?: string; remarks?: string }
          }
          const snag = db.prepare('SELECT * FROM snags WHERE id = ?').get(snagId) as Record<string, unknown> | undefined
          if (snag) {
            db.prepare(
              `UPDATE snags SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`
            ).run(snagChanges.status ?? snag.status, snagChanges.remarks ?? snag.remarks, snagId)

            // Notify engineer if QA re-opened or closed snag
            if (snagChanges.status === 'closed') {
              createNotification(
                snag.engineer_id as string || '',
                'snag_rectified',
                'Snag Closed',
                'Your snag has been verified and closed.',
                snagId
              )
            }
          }
          processed++

        } else {
          // Unknown type — skip silently
          processed++
        }
      } catch (e) {
        failed++
        errors.push(e instanceof Error ? e.message : 'Unknown error')
      }
    }

    res.json({ processed, failed, errors })
  })
)

router.get(
  '/pull',
  asyncHandler(async (req, res) => {
    const since = (req.query.since as string) || '1970-01-01'
    const db = getDB()
    const user = req.user!

    let flats: unknown[] = []
    let inspections: unknown[] = []
    let responses: unknown[] = []
    let snags: unknown[] = []
    let notifications: unknown[] = []

    if (user.role === 'engineer') {
      flats = (
        db.prepare(
          `SELECT f.* FROM flats f
           JOIN assignments a ON a.flat_id = f.id
           WHERE a.engineer_id = ? AND f.created_at > ?`
        ).all(user.id, since) as Record<string, unknown>[]
      ).map(rowToFlat)

      inspections = db
        .prepare(`SELECT * FROM inspections WHERE engineer_id = ? AND last_updated > ?`)
        .all(user.id, since)

      const inspIds = (inspections as { id: string }[]).map((i) => i.id)
      if (inspIds.length) {
        const placeholders = inspIds.map(() => '?').join(',')
        responses = db.prepare(`SELECT * FROM responses WHERE inspection_id IN (${placeholders})`).all(...inspIds)
        snags = db.prepare(`SELECT * FROM snags WHERE inspection_id IN (${placeholders})`).all(...inspIds)
      }
    }

    if (user.role === 'qa' || user.role === 'admin') {
      // QA/admin: return flats whose inspections changed since last pull
      const changedInspections = db
        .prepare(`SELECT DISTINCT flat_id FROM inspections WHERE last_updated > ?`)
        .all(since) as { flat_id: string }[]
      if (changedInspections.length) {
        const placeholders = changedInspections.map(() => '?').join(',')
        flats = (
          db.prepare(`SELECT f.* FROM flats f WHERE f.id IN (${placeholders})`)
            .all(...changedInspections.map((r) => r.flat_id)) as Record<string, unknown>[]
        ).map(rowToFlat)
      }
    }

    notifications = db
      .prepare(`SELECT * FROM notifications WHERE user_id = ? AND created_at > ?`)
      .all(user.id, since)

    res.json({ flats, inspections, responses, snags, notifications })
  })
)

export default router
