import { useCallback } from 'react'
import { responsesApi } from '../utils/api'
import { queueChange } from '../utils/sync'
import type { InspectionResponse, ResponseStatus } from '../types'

/**
 * Provides optimistic single-task status update and QA per-task decision helpers.
 * The caller is responsible for managing the responses array in state —
 * these functions return the updated response so the caller can merge it.
 */
export function useResponses() {
  /**
   * Engineer: update status (and optional remarks) for one task.
   * Req 1 & 2 — single-task save with offline queue fallback.
   */
  const updateStatus = useCallback(
    async (
      responseId: string,
      status: ResponseStatus,
      remarks?: string
    ): Promise<Partial<InspectionResponse> & { completionPct?: number }> => {
      try {
        const { data } = await responsesApi.updateStatus(responseId, { status, remarks })
        return data as Partial<InspectionResponse> & { completionPct?: number }
      } catch {
        await queueChange('save_inspection', { responseId, status, remarks })
        return { id: responseId, status, remarks: status === 'pending' ? '' : (remarks ?? '') }
      }
    },
    []
  )

  /**
   * Checker: set per-task QA decision.
   * Req 6 — approved | rejected | revision_required.
   */
  const setQaDecision = useCallback(
    async (
      responseId: string,
      qaDecision: 'approved' | 'rejected' | 'revision_required',
      qaRemark?: string
    ): Promise<Partial<InspectionResponse>> => {
      try {
        const { data } = await responsesApi.setQaDecision(responseId, { qaDecision, qaRemark })
        return data as Partial<InspectionResponse>
      } catch {
        await queueChange('qa_decision', { responseId, qaDecision, qaRemark })
        return {
          id: responseId,
          qaDecision,
          qaRemarks: qaRemark ?? '',
        }
      }
    },
    []
  )

  return { updateStatus, setQaDecision }
}
