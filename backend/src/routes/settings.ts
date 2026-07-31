import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { getSettings, setSettings, NOTIF_SETTING_DEFAULTS } from '../utils/appSettings'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(getSettings())
  })
)

router.put(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const allowedKeys = Object.keys(NOTIF_SETTING_DEFAULTS)
    const shape: Record<string, z.ZodTypeAny> = {}
    for (const key of allowedKeys) {
      if (key === 'notif.resume_idle_hours') {
        shape[key] = z.number().min(1).max(24).optional()
      } else {
        shape[key] = z.boolean().optional()
      }
    }
    const body = z.object(shape).parse(req.body)
    const updated = setSettings(body as Record<string, boolean | number>)
    res.json(updated)
  })
)

export default router
