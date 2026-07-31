import { v4 as uuidv4 } from 'uuid'
import { getDB, utcTs } from '../db/database'

export type FlatHistoryEventType =
  | 'inspection_started'
  | 'inspection_submitted'
  | 'inspection_resubmitted'
  | 'inspection_resumed'
  | 'review_approved'
  | 'review_rejected'
  | 'review_revision_required'
  | 'qa_review_started'
  | 'qa_review_resumed'
  | 'qa_task_revision'
  | 'qa_task_rejected'
  | 'qa_task_approved'
  | 'handed_over'
  | 'engineer_assigned'
  | 'status_changed'

export interface FlatHistoryEntry {
  id: string
  flatId: string
  eventType: FlatHistoryEventType
  actorId?: string
  actorName?: string
  actorRole?: string
  title: string
  description: string
  metadata: Record<string, unknown>
  createdAt: string
}

function getActor(actorId?: string) {
  if (!actorId) return { actorName: undefined, actorRole: undefined }
  const row = getDB()
    .prepare('SELECT name, role FROM users WHERE id = ?')
    .get(actorId) as { name: string; role: string } | undefined
  return { actorName: row?.name, actorRole: row?.role }
}

function insertHistory(entry: {
  id?: string
  flatId: string
  eventType: FlatHistoryEventType
  actorId?: string
  actorName?: string
  actorRole?: string
  title: string
  description?: string
  metadata?: Record<string, unknown>
  createdAt?: string
}): void {
  const actor =
    entry.actorName !== undefined
      ? { actorName: entry.actorName, actorRole: entry.actorRole }
      : getActor(entry.actorId)

  getDB()
    .prepare(
      `INSERT OR IGNORE INTO flat_history
       (id, flat_id, event_type, actor_id, actor_name, actor_role, title, description, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`
    )
    .run(
      entry.id ?? uuidv4(),
      entry.flatId,
      entry.eventType,
      entry.actorId ?? null,
      actor.actorName ?? null,
      actor.actorRole ?? null,
      entry.title,
      entry.description ?? '',
      JSON.stringify(entry.metadata ?? {}),
      entry.createdAt ?? null
    )
}

export function logFlatHistory(params: {
  flatId: string
  eventType: FlatHistoryEventType
  actorId?: string
  title: string
  description?: string
  metadata?: Record<string, unknown>
}): void {
  try {
    insertHistory(params)
  } catch {
    // History logging must never break the main workflow
  }
}

function backfillFlatHistory(flatId: string): void {
  const db = getDB()
  const prefix = `backfill-${flatId}`

  const inspection = db
    .prepare(
      `SELECT i.*, u.name AS engineer_name, u.role AS engineer_role
       FROM inspections i
       JOIN users u ON u.id = i.engineer_id
       WHERE i.flat_id = ?`
    )
    .get(flatId) as Record<string, unknown> | undefined

  if (inspection) {
    insertHistory({
      id: `${prefix}-started`,
      flatId,
      eventType: 'inspection_started',
      actorId: inspection.engineer_id as string,
      actorName: inspection.engineer_name as string,
      actorRole: inspection.engineer_role as string,
      title: 'Inspection started',
      description: `${inspection.engineer_name} began the snagging inspection.`,
      createdAt: utcTs(inspection.last_updated) ?? undefined,
    })

    const submissions = db
      .prepare(
        `SELECT n.id, n.created_at, n.message, u.name AS actor_name, u.role AS actor_role, u.id AS actor_id
         FROM notifications n
         JOIN users u ON u.id = n.user_id
         WHERE n.related_id = ? AND n.type = 'inspection_submitted' AND u.role = 'engineer'
         ORDER BY n.created_at ASC`
      )
      .all(flatId) as Record<string, unknown>[]

    submissions.forEach((n, index) => {
      const isResubmit = index > 0
      insertHistory({
        id: `${prefix}-submit-${n.id}`,
        flatId,
        eventType: isResubmit ? 'inspection_resubmitted' : 'inspection_submitted',
        actorId: n.actor_id as string,
        actorName: n.actor_name as string,
        actorRole: n.actor_role as string,
        title: isResubmit ? 'Resubmitted for QA review' : 'Submitted for QA review',
        description: (n.message as string) || 'Inspection sent to QA for review.',
        createdAt: utcTs(n.created_at) ?? undefined,
      })
    })

    if (submissions.length === 0 && inspection.submitted_at) {
      insertHistory({
        id: `${prefix}-submit-latest`,
        flatId,
        eventType: 'inspection_submitted',
        actorId: inspection.engineer_id as string,
        actorName: inspection.engineer_name as string,
        actorRole: inspection.engineer_role as string,
        title: 'Submitted for QA review',
        description: 'Inspection sent to QA for review.',
        createdAt: utcTs(inspection.submitted_at) ?? undefined,
      })
    }
  }

  const reviews = db
    .prepare(
      `SELECT r.*, u.name AS reviewer_name, u.role AS reviewer_role
       FROM reviews r
       JOIN users u ON u.id = r.qa_id
       WHERE r.flat_id = ?
       ORDER BY r.reviewed_at ASC`
    )
    .all(flatId) as Record<string, unknown>[]

  const reviewEventMap: Record<string, FlatHistoryEventType> = {
    approved: 'review_approved',
    rejected: 'review_rejected',
    revision_required: 'review_revision_required',
  }

  const reviewTitleMap: Record<string, string> = {
    approved: 'Approved by QA',
    rejected: 'Rejected by QA',
    revision_required: 'Revision requested by QA',
  }

  for (const r of reviews) {
    const decision = r.decision as string
    insertHistory({
      id: `${prefix}-review-${r.id}`,
      flatId,
      eventType: reviewEventMap[decision] ?? 'review_revision_required',
      actorId: r.qa_id as string,
      actorName: r.reviewer_name as string,
      actorRole: r.reviewer_role as string,
      title: reviewTitleMap[decision] ?? 'QA review completed',
      description: (r.overall_comments as string) || `QA marked this flat as ${decision.replace(/_/g, ' ')}.`,
      metadata: {
        reviewId: r.id,
        inspectionId: r.inspection_id,
        decision,
      },
      createdAt: utcTs(r.reviewed_at) ?? undefined,
    })
  }

  const flat = db.prepare('SELECT status FROM flats WHERE id = ?').get(flatId) as { status: string } | undefined
  if (flat?.status === 'handed_over') {
    insertHistory({
      id: `${prefix}-handover`,
      flatId,
      eventType: 'handed_over',
      title: 'Handed over to client',
      description: 'Flat marked as handed over to the client.',
    })
  }
}

export function getFlatHistory(flatId: string): FlatHistoryEntry[] {
  const db = getDB()
  const count = db
    .prepare('SELECT COUNT(*) AS c FROM flat_history WHERE flat_id = ?')
    .get(flatId) as { c: number }

  if (count.c === 0) {
    try {
      backfillFlatHistory(flatId)
    } catch {
      // Backfill is best-effort for legacy data
    }
  }

  const rows = db
    .prepare(
      `SELECT * FROM flat_history WHERE flat_id = ? ORDER BY datetime(created_at) DESC`
    )
    .all(flatId) as Record<string, unknown>[]

  return rows.map((r) => ({
    id: r.id as string,
    flatId: r.flat_id as string,
    eventType: r.event_type as FlatHistoryEventType,
    actorId: (r.actor_id as string) || undefined,
    actorName: (r.actor_name as string) || undefined,
    actorRole: (r.actor_role as string) || undefined,
    title: r.title as string,
    description: r.description as string,
    metadata: JSON.parse((r.metadata as string) || '{}'),
    createdAt: utcTs(r.created_at) ?? new Date().toISOString(),
  }))
}
