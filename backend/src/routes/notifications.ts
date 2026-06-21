import { Router } from 'express'
import { getDB, utcTs } from '../db/database'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = getDB()
      .prepare(
        `SELECT * FROM notifications WHERE user_id = ?
         ORDER BY is_read ASC, created_at DESC LIMIT 50`
      )
      .all(req.user!.id) as Record<string, unknown>[]
    res.json(
      rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        title: r.title,
        message: r.message,
        relatedId: r.related_id,
        isRead: Boolean(r.is_read),
        createdAt: utcTs(r.created_at),
      }))
    )
  })
)

router.get(
  '/count',
  asyncHandler(async (req, res) => {
    const row = getDB()
      .prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(req.user!.id) as { c: number }
    res.json({ unread: row.c })
  })
)

router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    getDB().prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id)
    res.json({ success: true })
  })
)

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    getDB().prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id)
    res.json({ success: true })
  })
)

export default router
