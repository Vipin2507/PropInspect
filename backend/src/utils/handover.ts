import { getDB } from '../db/database'
import { calcCompletionPct } from './inspectionTasks'

export const HANDOVER_COMPLETE = 'handed_over'
export const HANDOVER_SNAG_LEFT = 'handed_over_snag_left'

export function isHandoverStatus(status: string): boolean {
  return status === HANDOVER_COMPLETE || status === HANDOVER_SNAG_LEFT
}

/** Checklist work stays open after incomplete handover. */
export function isInspectionWorkAllowed(
  inspectionStatus: string,
  flatStatus?: string | null
): boolean {
  if (flatStatus === HANDOVER_SNAG_LEFT) return true
  return ['draft', 'revision_required'].includes(inspectionStatus)
}

/** Incomplete checklist (< 100%) → handed over with snag left. */
export function resolveHandoverStatus(
  flatId: string
): typeof HANDOVER_COMPLETE | typeof HANDOVER_SNAG_LEFT {
  const inspection = getDB()
    .prepare('SELECT id FROM inspections WHERE flat_id = ?')
    .get(flatId) as { id: string } | undefined
  if (!inspection) return HANDOVER_SNAG_LEFT
  return calcCompletionPct(inspection.id) < 100 ? HANDOVER_SNAG_LEFT : HANDOVER_COMPLETE
}

export function handoverHistoryCopy(status: string) {
  if (status === HANDOVER_SNAG_LEFT) {
    return {
      eventType: 'handed_over_snag_left' as const,
      title: 'Handed over with snag left',
      description: 'Flat handed over to the client before the checklist was 100% complete.',
    }
  }
  return {
    eventType: 'handed_over' as const,
    title: 'Handed over to client',
    description: 'Flat marked as handed over to the client.',
  }
}
