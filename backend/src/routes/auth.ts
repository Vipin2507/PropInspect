import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDB, rowToUser } from '../db/database'
import { authenticate, signToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()
const otpStore = new Map<string, { otp: string; expires: number }>()

const loginSchema = z.object({
  email: z.string().email().optional(),
  mobile: z.string().optional(),
  password: z.string().min(1),
}).refine((d) => d.email || d.mobile, { message: 'Email or mobile required' })

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  mobile: z.string().min(10),
  password: z.string().min(6),
  role: z.enum(['admin', 'engineer', 'qa', 'viewer']),
})

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body)
    const db = getDB()
    let row: Record<string, unknown> | undefined
    if (body.email) {
      row = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(body.email) as Record<string, unknown>
    } else if (body.mobile) {
      row = db.prepare('SELECT * FROM users WHERE mobile = ? AND is_active = 1').get(body.mobile) as Record<string, unknown>
    }
    if (!row || !bcrypt.compareSync(body.password, row.password as string)) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    const user = rowToUser(row)
    const token = signToken(user.id as string)
    res.json({ user, token })
  })
)

router.post(
  '/register',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body)
    const db = getDB()
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR mobile = ?').get(body.email, body.mobile)
    if (existing) {
      res.status(400).json({ error: 'Email or mobile already registered' })
      return
    }
    const id = uuidv4()
    const hash = bcrypt.hashSync(body.password, 10)
    db.prepare(
      `INSERT INTO users (id, name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, body.name, body.email, body.mobile, hash, body.role)
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown>
    const user = rowToUser(row)
    const token = signToken(id)
    res.status(201).json({ user, token })
  })
)

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user })
  })
)

router.patch(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const body = z.object({
      name:        z.string().min(1).optional(),
      email:       z.string().email().optional(),
      mobile:      z.string().min(10).optional(),
      newPassword: z.string().min(6).optional(),
    }).parse(req.body)

    const db  = getDB()
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>
    if (!row) { res.status(404).json({ error: 'User not found' }); return }

    const updates: Record<string, unknown> = {
      name:   body.name   ?? row.name,
      email:  body.email  ?? row.email,
      mobile: body.mobile ?? row.mobile,
    }
    if (body.newPassword) {
      updates.password = bcrypt.hashSync(body.newPassword, 10)
    }

    db.prepare(
      `UPDATE users SET name = ?, email = ?, mobile = ?, password = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(updates.name, updates.email, updates.mobile, updates.password ?? row.password, req.user!.id)

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>
    res.json({ user: rowToUser(updated) })
  })
)

router.post(
  '/otp/send',
  asyncHandler(async (req, res) => {
    const { mobile } = z.object({ mobile: z.string().min(10) }).parse(req.body)
    const user = getDB().prepare('SELECT * FROM users WHERE mobile = ? AND is_active = 1').get(mobile)
    if (!user) {
      res.status(404).json({ error: 'Mobile not registered' })
      return
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    otpStore.set(mobile, { otp, expires: Date.now() + 5 * 60 * 1000 })
    res.json({ success: true, message: 'OTP sent', otp: process.env.NODE_ENV === 'development' ? otp : undefined })
  })
)

router.post(
  '/otp/verify',
  asyncHandler(async (req, res) => {
    const { mobile, otp } = z.object({ mobile: z.string(), otp: z.string().length(6) }).parse(req.body)
    const stored = otpStore.get(mobile)
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      res.status(401).json({ error: 'Invalid or expired OTP' })
      return
    }
    otpStore.delete(mobile)
    const row = getDB().prepare('SELECT * FROM users WHERE mobile = ?').get(mobile) as Record<string, unknown>
    const user = rowToUser(row)
    const token = signToken(user.id as string)
    res.json({ user, token })
  })
)

export default router
