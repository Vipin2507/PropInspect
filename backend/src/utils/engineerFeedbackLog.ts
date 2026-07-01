import { v4 as uuidv4 } from 'uuid'
import { getDB, utcTs } from '../db/database'
import { calcCompletionPctFromDb } from './inspectionTasks'

export type EngineerFeedbackType = 'revision_required' | 'rejected' | 'approved'

export interface EngineerFeedbackRow {
  id: string
  flatId: string
  inspectionId: string
  responseId: string
  itemId: string
  itemLabel: string
  categoryName: string
  flatNumber: string
  towerName: string
  projectId: string
  engineerId: string
  qaId: string
  qaName: string
  feedbackType: EngineerFeedbackType
  remark: string
  seenAt: string | null
  createdAt: string
}

function getFlatMeta(flatId: string) {
  const db = getDB()
  const row = db
    .prepare(
      `SELECT f.flat_number, f.project_id, t.name AS tower_name
       FROM flats f
       LEFT JOIN towers t ON t.id = f.tower_id
       WHERE f.id = ?`
    )
    .get(flatId) as { flat_number: string; project_id: string; tower_name: string } | undefined
  return {
    flatNumber: row?.flat_number ?? flatId,
    projectId: row?.project_id ?? '',
    towerName: row?.tower_name ?? '',
  }
}

function rowToFeedback(r: Record<string, unknown>): EngineerFeedbackRow {
  return {
    id: r.id as string,
    flatId: r.flat_id as string,
    inspectionId: r.inspection_id as string,
    responseId: r.response_id as string,
    itemId: r.item_id as string,
    itemLabel: r.item_label as string,
    categoryName: r.category_name as string,
    flatNumber: r.flat_number as string,
    towerName: r.tower_name as string,
    projectId: r.project_id as string,
    engineerId: r.engineer_id as string,
    qaId: r.qa_id as string,
    qaName: r.qa_name as string,
    feedbackType: r.feedback_type as EngineerFeedbackType,
    remark: r.remark as string,
    seenAt: utcTs(r.seen_at as string) ?? null,
    createdAt: utcTs(r.created_at as string) ?? '',
  }
}

/** Log QA per-task feedback for the engineer Changes Log. */
export function logEngineerFeedback(params: {
  flatId: string
  inspectionId: string
  responseId: string
  itemId: string
  itemLabel: string
  categoryName: string
  engineerId: string
  qaId: string
  qaName: string
  feedbackType: EngineerFeedbackType
  remark: string
}): void {
  try {
    const flatMeta = getFlatMeta(params.flatId)
    getDB()
      .prepare(
        `INSERT INTO engineer_feedback_log
         (id, flat_id, inspection_id, response_id, item_id, item_label, category_name,
          flat_number, tower_name, project_id, engineer_id, qa_id, qa_name,
          feedback_type, remark, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        uuidv4(),
        params.flatId,
        params.inspectionId,
        params.responseId,
        params.itemId,
        params.itemLabel,
        params.categoryName,
        flatMeta.flatNumber,
        flatMeta.towerName,
        flatMeta.projectId,
        params.engineerId,
        params.qaId,
        params.qaName,
        params.feedbackType,
        params.remark
      )
  } catch {
    // Must not break QA saves
  }
}

export function countUnseenFeedback(engineerId: string, flatId?: string): number {
  const db = getDB()
  if (flatId) {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM engineer_feedback_log
         WHERE engineer_id = ? AND flat_id = ? AND seen_at IS NULL`
      )
      .get(engineerId, flatId) as { c: number }
    return row?.c ?? 0
  }
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM engineer_feedback_log
       WHERE engineer_id = ? AND seen_at IS NULL`
    )
    .get(engineerId) as { c: number }
  return row?.c ?? 0
}

export function markFeedbackSeen(feedbackId: string, engineerId: string): boolean {
  const db = getDB()
  const row = db
    .prepare(
      `SELECT id FROM engineer_feedback_log WHERE id = ? AND engineer_id = ? AND seen_at IS NULL`
    )
    .get(feedbackId, engineerId)
  if (!row) return false
  db.prepare(
    `UPDATE engineer_feedback_log SET seen_at = datetime('now') WHERE id = ?`
  ).run(feedbackId)
  return true
}

export function markFlatFeedbackSeen(flatId: string, engineerId: string): number {
  const db = getDB()
  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS c FROM engineer_feedback_log
       WHERE flat_id = ? AND engineer_id = ? AND seen_at IS NULL`
    )
    .get(flatId, engineerId) as { c: number } | undefined
  const count = countRow?.c ?? 0
  if (count === 0) return 0
  db.prepare(
    `UPDATE engineer_feedback_log SET seen_at = datetime('now')
     WHERE flat_id = ? AND engineer_id = ? AND seen_at IS NULL`
  ).run(flatId, engineerId)
  return count
}

/** Auto-acknowledge when engineer updates the task. */
export function markFeedbackSeenForResponse(responseId: string, engineerId: string): void {
  try {
    getDB()
      .prepare(
        `UPDATE engineer_feedback_log SET seen_at = datetime('now')
         WHERE response_id = ? AND engineer_id = ? AND seen_at IS NULL`
      )
      .run(responseId, engineerId)
  } catch {
    /* ignore */
  }
}

export interface EngineerFeedbackGroup {
  flatId: string
  flatNumber: string
  towerName: string
  projectId: string
  qaName: string
  flatStatus: string
  completionPct: number
  unseenCount: number
  lastFeedbackAt: string
  feedback: EngineerFeedbackRow[]
}

export function getEngineerFeedbackGrouped(opts: {
  engineerId: string
  unseenOnly?: boolean
  flatId?: string
  limit?: number
}): EngineerFeedbackGroup[] {
  const db = getDB()
  let sql = `SELECT * FROM engineer_feedback_log WHERE engineer_id = ?`
  const params: unknown[] = [opts.engineerId]

  if (opts.unseenOnly !== false) {
    sql += ` AND seen_at IS NULL`
  }
  if (opts.flatId) {
    sql += ` AND flat_id = ?`
    params.push(opts.flatId)
  }

  sql += ` ORDER BY datetime(created_at) DESC LIMIT ?`
  params.push(opts.limit ?? 500)

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
  const byFlat = new Map<string, EngineerFeedbackRow[]>()

  for (const row of rows) {
    const item = rowToFeedback(row)
    if (!byFlat.has(item.flatId)) byFlat.set(item.flatId, [])
    byFlat.get(item.flatId)!.push(item)
  }

  const groups: EngineerFeedbackGroup[] = []

  for (const [flatId, feedback] of byFlat.entries()) {
    const flat = db
      .prepare(
        `SELECT f.status, f.flat_number, t.name AS tower_name
         FROM flats f
         LEFT JOIN towers t ON t.id = f.tower_id
         WHERE f.id = ?`
      )
      .get(flatId) as { status: string; flat_number: string; tower_name: string } | undefined

    const inspection = db
      .prepare('SELECT id FROM inspections WHERE flat_id = ?')
      .get(flatId) as { id: string } | undefined

    let completionPct = 0
    if (inspection) {
      completionPct = calcCompletionPctFromDb(inspection.id)
    }

    groups.push({
      flatId,
      flatNumber: flat?.flat_number ?? feedback[0]?.flatNumber ?? flatId,
      towerName: flat?.tower_name ?? feedback[0]?.towerName ?? '',
      projectId: feedback[0]?.projectId ?? '',
      qaName: feedback[0]?.qaName ?? '',
      flatStatus: flat?.status ?? 'in_progress',
      completionPct,
      unseenCount: feedback.filter((f) => !f.seenAt).length,
      lastFeedbackAt: feedback[0]?.createdAt ?? '',
      feedback,
    })
  }

  groups.sort(
    (a, b) => new Date(b.lastFeedbackAt).getTime() - new Date(a.lastFeedbackAt).getTime()
  )

  return groups
}
