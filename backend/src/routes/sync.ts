import { Router } from 'express'
import { z } from 'zod'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToFlat } from '../utils/mappers'
import { validateAndSubmitFromSync } from '../services/syncService'

const router = Router()
router.use(authenticate)

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

        if (type === 'save_inspection') {
          const inspectionId = payload.inspectionId as string
          const responses = payload.responses as Array<{ id: string; status?: string; remarks?: string }>
          for (const r of responses) {
            db.prepare(`UPDATE responses SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`).run(
              r.status ?? 'pending',
              r.remarks ?? '',
              r.id
            )
          }
          db.prepare(`UPDATE inspections SET last_updated = datetime('now') WHERE id = ?`).run(inspectionId)
          processed++
        } else if (type === 'submit_inspection' || type === 'resubmit_inspection') {
          validateAndSubmitFromSync(payload.inspectionId as string, type === 'resubmit_inspection')
          processed++
        } else if (type === 'review_decision') {
          processed++
        } else if (type === 'update_snag') {
          const { snagId, changes: snagChanges } = payload as { snagId: string; changes: Record<string, unknown> }
          const snag = db.prepare('SELECT * FROM snags WHERE id = ?').get(snagId) as Record<string, unknown>
          if (snag) {
            db.prepare(
              `UPDATE snags SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`
            ).run((snagChanges.status as string) ?? snag.status, (snagChanges.remarks as string) ?? snag.remarks, snagId)
          }
          processed++
        } else {
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

    notifications = db
      .prepare(`SELECT * FROM notifications WHERE user_id = ? AND created_at > ?`)
      .all(user.id, since)

    res.json({ flats, inspections, responses, snags, notifications })
  })
)

export default router
