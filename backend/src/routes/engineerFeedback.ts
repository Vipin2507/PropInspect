import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler, AppError } from '../middleware/errorHandler'
import { param } from '../utils/params'
import {
  countUnseenFeedback,
  getEngineerFeedbackGrouped,
  markFeedbackSeen,
  markFlatFeedbackSeen,
} from '../utils/engineerFeedbackLog'

const router = Router()
router.use(authenticate, requireRole('engineer', 'admin'))

/** GET /engineer/feedback — QA feedback grouped by flat */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const engineerId =
      req.user!.role === 'admin' && req.query.engineerId
        ? (req.query.engineerId as string)
        : req.user!.id

    const { flatId, unseenOnly } = req.query
    const groups = getEngineerFeedbackGrouped({
      engineerId,
      flatId: flatId as string | undefined,
      unseenOnly: unseenOnly !== 'false',
    })
    res.json({
      totalUnseen: countUnseenFeedback(engineerId),
      groups,
    })
  })
)

router.get(
  '/count',
  asyncHandler(async (req, res) => {
    const engineerId = req.user!.role === 'admin' && req.query.engineerId
      ? (req.query.engineerId as string)
      : req.user!.id
    res.json({ unseen: countUnseenFeedback(engineerId) })
  })
)

router.patch(
  '/:id/seen',
  asyncHandler(async (req, res) => {
    const ok = markFeedbackSeen(param(req, 'id'), req.user!.id)
    if (!ok) throw new AppError('Feedback not found or already seen', 404)
    res.json({ ok: true })
  })
)

router.post(
  '/mark-flat-seen',
  asyncHandler(async (req, res) => {
    const body = z.object({ flatId: z.string() }).parse(req.body)
    const count = markFlatFeedbackSeen(body.flatId, req.user!.id)
    res.json({ ok: true, markedCount: count })
  })
)

export default router
