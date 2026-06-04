import { Router } from 'express'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToFloor } from '../utils/mappers'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const towerId = req.query.towerId as string
    if (!towerId) {
      res.status(400).json({ error: 'towerId required' })
      return
    }
    const db = getDB()
    const rows = db.prepare('SELECT * FROM floors WHERE tower_id = ? ORDER BY floor_number').all(towerId) as Record<string, unknown>[]
    const floors = rows.map((row) => {
      const flatCount = (
        db.prepare('SELECT COUNT(*) as c FROM flats WHERE floor_id = ?').get(row.id) as { c: number }
      ).c
      return { ...rowToFloor(row), flatCount }
    })
    res.json(floors)
  })
)

export default router
