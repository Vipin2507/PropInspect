import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler, AppError } from '../middleware/errorHandler'
import {
  countUnreviewedChanges,
  getChangesGrouped,
  markChangeReviewed,
  markFlatChangesReviewed,
} from '../utils/taskChangeLog'
import { param } from '../utils/params'

const router = Router()
router.use(authenticate, requireRole('qa', 'admin'))

/** GET /qa/changes — grouped feed, newest flats first */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { projectId, towerId, flatId, unreviewedOnly } = req.query
    const groups = getChangesGrouped({
      projectId: projectId as string | undefined,
      towerId: towerId as string | undefined,
      flatId: flatId as string | undefined,
      unreviewedOnly: unreviewedOnly !== 'false',
    })
    res.json({
      totalUnreviewed: countUnreviewedChanges(),
      groups,
    })
  })
)

/** GET /qa/changes/count */
router.get(
  '/count',
  asyncHandler(async (_req, res) => {
    res.json({ unreviewed: countUnreviewedChanges() })
  })
)

/** PATCH /qa/changes/:id/reviewed — mark one change reviewed */
router.patch(
  '/:id/reviewed',
  asyncHandler(async (req, res) => {
    const ok = markChangeReviewed(param(req, 'id'), req.user!.id)
    if (!ok) throw new AppError('Change not found or already reviewed', 404)
    res.json({ ok: true })
  })
)

/** POST /qa/changes/mark-flat-reviewed */
router.post(
  '/mark-flat-reviewed',
  asyncHandler(async (req, res) => {
    const body = z.object({ flatId: z.string() }).parse(req.body)
    const count = markFlatChangesReviewed(body.flatId, req.user!.id)
    res.json({ ok: true, markedCount: count })
  })
)

export default router
