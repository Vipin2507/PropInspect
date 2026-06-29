import { TOTAL_ITEMS } from '../constants/checklist'
import type { Flat, Inspection, InspectionResponse } from '../types'

/** Client-side completion — matches server (done / full checklist template). */
export function computeCompletionFromResponses(responses: InspectionResponse[]) {
  const totalItems = TOTAL_ITEMS
  const completedCount = responses.filter((r) => r.status !== 'pending').length
  const pendingCount = Math.max(0, totalItems - completedCount)
  const completionPct =
    totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0
  return { totalItems, completedCount, pendingCount, completionPct }
}

export function applyCompletionToInspection(
  inspection: Inspection,
  responses?: InspectionResponse[]
): Inspection {
  const res = responses ?? inspection.responses
  return { ...inspection, ...computeCompletionFromResponses(res), responses: res }
}

/** Progress % for flat list cards — never use hardcoded status guesses. */
export function resolveFlatProgressPct(flat: Flat): number {
  if (flat.completionPct !== undefined && flat.completionPct !== null) {
    return flat.completionPct
  }
  if (['approved', 'handed_over', 'submitted'].includes(flat.status)) return 100
  return 0
}
