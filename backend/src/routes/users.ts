import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getDB, rowToUser } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler, AppError } from '../middleware/errorHandler'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const roleRaw = req.query.role
    const role = typeof roleRaw === 'string' && roleRaw.trim() ? roleRaw.trim() : undefined
    const db = getDB()
    try {
      const rows = role
        ? db.prepare('SELECT * FROM users WHERE role = ? ORDER BY name').all(role)
        : db.prepare('SELECT * FROM users ORDER BY name').all()
      res.json((Array.isArray(rows) ? rows : []).map(rowToUser))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[users.list]', err)
      throw new AppError(`Could not load users: ${message}`, 500)
    }
  })
)

function sqliteToUserError(err: unknown): AppError {
  const message = err instanceof Error ? err.message : String(err)
  if (/UNIQUE/i.test(message)) {
    return new AppError('Email or mobile already registered', 400)
  }
  if (/CHECK constraint/i.test(message)) {
    return new AppError('Invalid role', 400)
  }
  if (/NOT NULL/i.test(message)) {
    return new AppError('Name, email, mobile and password are required', 400)
  }
  return new AppError(message || 'Could not create user', 500)
}

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        mobile: z.string().optional(),
        password: z.string().min(6),
        role: z.enum(['admin', 'engineer', 'qa', 'viewer']),
      })
      .parse(req.body)

    const id = uuidv4()
    const name = body.name.trim()
    const email = body.email.trim().toLowerCase()
    const mobile = (body.mobile ?? '').replace(/\s+/g, '').trim() || `u-${id.slice(0, 8)}`
    const hash = bcrypt.hashSync(body.password, 10)
    const db = getDB()

    const taken = db
      .prepare('SELECT email, mobile FROM users WHERE LOWER(email) = ? OR mobile = ?')
      .get(email, mobile) as { email?: string; mobile?: string } | undefined
    if (taken) {
      const sameEmail = String(taken.email ?? '').toLowerCase() === email
      throw new AppError(sameEmail ? 'Email already registered' : 'Mobile already registered', 400)
    }

    try {
      db.prepare(
        `INSERT INTO users (id, name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, name, email, mobile, hash, body.role)
    } catch (err) {
      throw sqliteToUserError(err)
    }

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!row) throw new AppError('User was created but could not be loaded', 500)
    res.status(201).json(rowToUser(row))
  })
)

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        mobile: z.string().optional(),
        role: z.enum(['admin', 'engineer', 'qa', 'viewer']).optional(),
      })
      .parse(req.body)
    const db = getDB()
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!row) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    db.prepare(
      `UPDATE users SET name = ?, email = ?, mobile = ?, role = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      body.name ?? row.name,
      body.email ? body.email.trim().toLowerCase() : row.email,
      body.mobile ?? row.mobile,
      body.role ?? row.role,
      req.params.id
    )
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as Record<string, unknown>
    res.json(rowToUser(updated))
  })
)

router.patch(
  '/:id/password',
  asyncHandler(async (req, res) => {
    const { newPassword } = z.object({ newPassword: z.string().min(6) }).parse(req.body)
    const hash = bcrypt.hashSync(newPassword, 10)
    
    // FIX: Changed "now" to 'now' so SQLite treats it as a string literal
    getDB().prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.params.id)
    
    res.json({ success: true })
  })
)

router.patch(
  '/:id/toggle-active',
  asyncHandler(async (req, res) => {
    const db = getDB()
    const row = db.prepare('SELECT is_active FROM users WHERE id = ?').get(req.params.id) as { is_active: number }
    if (!row) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    db.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(
      row.is_active ? 0 : 1,
      req.params.id
    )
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as Record<string, unknown>
    res.json(rowToUser(updated))
  })
)



router.get(
  '/:id/stats',
  asyncHandler(async (req, res) => {
    const db = getDB()
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.params.id) as { name: string }
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    const assigned = (
      db.prepare('SELECT COUNT(*) as c FROM assignments WHERE engineer_id = ?').get(req.params.id) as { c: number }
    ).c
    const submitted = (
      db.prepare(`SELECT COUNT(*) as c FROM inspections WHERE engineer_id = ? AND status != 'draft'`).get(req.params.id) as { c: number }
    ).c
    const approved = (
      db.prepare(`SELECT COUNT(*) as c FROM inspections WHERE engineer_id = ? AND status = 'approved'`).get(req.params.id) as { c: number }
    ).c
    const rejected = (
      db.prepare(`SELECT COUNT(*) as c FROM inspections WHERE engineer_id = ? AND status = 'rejected'`).get(req.params.id) as { c: number }
    ).c
    res.json({ engineerId: req.params.id, name: user.name, assigned, submitted, approved, rejected })
  })
)

export default router
