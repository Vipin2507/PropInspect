import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDB, rowToProject } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { getProjectStats } from '../utils/stats'
import { param } from '../utils/params'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = getDB().prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Record<string, unknown>[]
    const projects = rows.map((row) => {
      const p = rowToProject(row)
      const stats = getProjectStats(p.id as string, p.name as string)
      return { ...p, stats }
    })
    res.json(projects)
  })
)

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({ name: z.string(), location: z.string().optional(), developerName: z.string().optional() })
      .parse(req.body)
    const id = uuidv4()
    getDB()
      .prepare(
        `INSERT INTO projects (id, name, location, developer_name, created_by) VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, body.name, body.location || '', body.developerName || '', req.user!.id)
    const row = getDB().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown>
    res.status(201).json(rowToProject(row))
  })
)

router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const body = z
      .object({
        name: z.string().optional(),
        location: z.string().optional(),
        developerName: z.string().optional(),
        status: z.enum(['active', 'completed', 'on_hold']).optional(),
      })
      .parse(req.body)
    const db = getDB()
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
    if (!existing) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    const row = existing as Record<string, unknown>
    db.prepare(
      `UPDATE projects SET name = ?, location = ?, developer_name = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      body.name ?? row.name,
      body.location ?? row.location,
      body.developerName ?? row.developer_name,
      body.status ?? row.status,
      id
    )
    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown>
    res.json(rowToProject(updated))
  })
)

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    getDB().prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  })
)

router.get(
  '/:id/stats',
  asyncHandler(async (req, res) => {
    const row = getDB().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json(getProjectStats(param(req, 'id'), row.name as string))
  })
)

export default router
