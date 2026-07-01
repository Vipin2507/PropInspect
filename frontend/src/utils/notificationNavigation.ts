import { flatsApi, inspectionsApi, reviewsApi, snagsApi } from './api'
import { getFlatById, saveInspection, saveSingleFlat } from './storage'
import { ROUTES } from '../constants/routes'
import type { Notification } from '../types'

async function inspectionIdForFlat(flatId: string): Promise<string | null> {
  try {
    const cached = await getFlatById(flatId)
    if (cached?.inspection?.id) return cached.inspection.id
  } catch { /* ignore */ }

  try {
    const { data: flat } = await flatsApi.get(flatId)
    await saveSingleFlat(flat)
    if (flat.inspection?.id) return flat.inspection.id
  } catch { /* ignore */ }

  try {
    const { data: insp } = await inspectionsApi.getByFlat(flatId)
    await saveInspection(insp)
    return insp.id
  } catch {
    return null
  }
}

/** Pre-load data for the destination route before navigating. */
export async function warmRouteData(route: string): Promise<void> {
  const qaReview = route.match(/^\/qa\/reviews\/([^/]+)$/)
  if (qaReview) {
    const inspectionId = qaReview[1]
    try {
      const { data } = await reviewsApi.get(inspectionId)
      localStorage.setItem(`review_detail_${inspectionId}`, JSON.stringify(data))
    } catch { /* page will retry */ }
    return
  }

  const flatRoute = route.match(/^\/engineer\/flats\/([^/]+)/)
  if (flatRoute) {
    const flatId = flatRoute[1]
    try {
      const { data: flat } = await flatsApi.get(flatId)
      await saveSingleFlat(flat)
      const { data: insp } = await inspectionsApi.getByFlat(flatId)
      await saveInspection(insp)
    } catch { /* page will retry */ }
    return
  }

  const snagRoute = route.match(/^\/desnagging\/([^/]+)$/)
  if (snagRoute) {
    const snagId = snagRoute[1]
    try {
      const { data } = await snagsApi.get(snagId)
      const { getDb } = await import('./db')
      const db = await getDb()
      await db.put('snags', data as unknown as Record<string, unknown>)
    } catch { /* page will retry */ }
  }
}

export async function resolveNotificationRoute(
  n: Notification,
  role: string
): Promise<string> {
  const id = n.relatedId

  switch (n.type) {
    case 'inspection_submitted': {
      if (role === 'qa' || role === 'admin') {
        const inspectionId = await inspectionIdForFlat(id)
        if (inspectionId) return ROUTES.QA_REVIEW_DETAIL(inspectionId)
        return ROUTES.QA_REVIEWS
      }
      return ROUTES.ENGINEER_FLAT(id)
    }

    case 'qa_task_revision':
    case 'qa_task_rejected':
      if (role === 'engineer' || role === 'admin') {
        return ROUTES.ENGINEER_CHANGES
      }
      return ROUTES.ENGINEER_FLAT(id)

    case 'revision_required':
    case 'inspection_rejected':
      if (role === 'engineer' || role === 'admin') {
        return ROUTES.ENGINEER_FLAT(id)
      }
      if (role === 'qa') {
        const inspectionId = await inspectionIdForFlat(id)
        if (inspectionId) return ROUTES.QA_REVIEW_DETAIL(inspectionId)
        return ROUTES.QA_REVIEWS
      }
      return ROUTES.ENGINEER_FLAT(id)

    case 'inspection_approved':
      if (role === 'engineer' || role === 'admin') {
        return ROUTES.ENGINEER_INSPECTION_SUMMARY(id)
      }
      if (role === 'qa') {
        const inspectionId = await inspectionIdForFlat(id)
        if (inspectionId) return ROUTES.QA_REVIEW_DETAIL(inspectionId)
        return ROUTES.QA_HISTORY
      }
      return ROUTES.ENGINEER_FLAT(id)

    case 'snag_assigned':
      if (role === 'engineer' || role === 'admin') {
        return ROUTES.ENGINEER_FLAT(id)
      }
      if (role === 'qa') {
        const inspectionId = await inspectionIdForFlat(id)
        if (inspectionId) return ROUTES.QA_REVIEW_DETAIL(inspectionId)
        return ROUTES.QA_REVIEWS
      }
      return ROUTES.ENGINEER_FLAT(id)

    case 'flat_completion':
      return ROUTES.ENGINEER_FLAT(id)

    case 'snag_rectified':
      return ROUTES.DESNAGGING_DETAIL(id)

    default:
      if (role === 'engineer') return ROUTES.ENGINEER_FLATS
      if (role === 'qa') return ROUTES.QA_REVIEWS
      return ROUTES.ADMIN
  }
}
