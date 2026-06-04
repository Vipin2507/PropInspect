import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = getDB().prepare('SELECT * FROM checklist_templates ORDER BY is_default DESC, name').all() as Record<string, unknown>[]
    res.json(rows.map(mapTemplate))
  })
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = getDB().prepare('SELECT * FROM checklist_templates WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'Template not found' })
      return
    }
    res.json(mapTemplate(row))
  })
)

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const body = z.object({ name: z.string(), sections: z.array(z.unknown()) }).parse(req.body)
    const id = uuidv4()
    getDB()
      .prepare(`INSERT INTO checklist_templates (id, name, sections, created_by) VALUES (?, ?, ?, ?)`)
      .run(id, body.name, JSON.stringify(body.sections), req.user!.id)
    const row = getDB().prepare('SELECT * FROM checklist_templates WHERE id = ?').get(id) as Record<string, unknown>
    res.status(201).json(mapTemplate(row))
  })
)

router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const body = z.object({ name: z.string().optional(), sections: z.array(z.unknown()).optional() }).parse(req.body)
    const db = getDB()
    const row = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'Template not found' })
      return
    }
    db.prepare(
      `UPDATE checklist_templates SET name = ?, sections = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(body.name ?? row.name, body.sections ? JSON.stringify(body.sections) : row.sections, req.params.id)
    const updated = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(req.params.id) as Record<string, unknown>
    res.json(mapTemplate(updated))
  })
)

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    getDB().prepare('DELETE FROM checklist_templates WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  })
)

router.post(
  '/:id/set-default',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const db = getDB()
    db.prepare('UPDATE checklist_templates SET is_default = 0').run()
    db.prepare('UPDATE checklist_templates SET is_default = 1 WHERE id = ?').run(req.params.id)
    const row = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(req.params.id) as Record<string, unknown>
    res.json(mapTemplate(row))
  })
)

function mapTemplate(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    categories: JSON.parse(row.sections as string),
    isDefault: Boolean(row.is_default),
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export default router
