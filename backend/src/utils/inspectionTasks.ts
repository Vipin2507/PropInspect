import { getDB } from '../db/database'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../constants/checklist'

/** Total checklist tasks defined in the default template. */
export function getExpectedTaskCount(): number {
  return DEFAULT_CHECKLIST_CATEGORIES.reduce((n, cat) => n + cat.items.length, 0)
}

/**
 * Ensure every checklist item has a response row for this inspection.
 * Back-fills rows when the template grows after an inspection was started.
 */
export function syncInspectionResponses(inspectionId: string): number {
  const db = getDB()
  const existing = db
    .prepare('SELECT item_id FROM responses WHERE inspection_id = ?')
    .all(inspectionId) as { item_id: string }[]
  const existingIds = new Set(existing.map((r) => r.item_id))

  const insert = db.prepare(
    `INSERT INTO responses (id, inspection_id, item_id, category_id, status) VALUES (?, ?, ?, ?, 'pending')`
  )

  let added = 0
  for (const cat of DEFAULT_CHECKLIST_CATEGORIES) {
    for (const item of cat.items) {
      if (existingIds.has(item.id)) continue
      insert.run(`${inspectionId}_${item.id}`, inspectionId, item.id, cat.id)
      added++
    }
  }
  return added
}

export function countCompletedTasks(inspectionId: string, sync = true): number {
  if (sync) syncInspectionResponses(inspectionId)
  return countCompletedTasksRaw(inspectionId)
}

function countCompletedTasksRaw(inspectionId: string): number {
  const db = getDB()
  const row = db
    .prepare(
      `SELECT SUM(CASE WHEN status IN ('pass','fail','na') THEN 1 ELSE 0 END) as done
       FROM responses WHERE inspection_id = ?`
    )
    .get(inspectionId) as { done: number | null }
  return row?.done ?? 0
}

export function countPendingTasks(inspectionId: string): number {
  return getExpectedTaskCount() - countCompletedTasks(inspectionId)
}

export function countPendingTasksFromDb(inspectionId: string): number {
  return getExpectedTaskCount() - countCompletedTasksRaw(inspectionId)
}

/**
 * Completion % based on the full checklist template, not only existing DB rows.
 * Missing tasks count as pending (incomplete).
 */
export function calcCompletionPct(inspectionId: string): number {
  syncInspectionResponses(inspectionId)
  return calcCompletionPctFromDb(inspectionId)
}

/** Fast path for hot paths (e.g. per-task PATCH) — caller should sync rows when needed. */
export function calcCompletionPctFromDb(inspectionId: string): number {
  const expected = getExpectedTaskCount()
  if (expected === 0) return 0
  const done = countCompletedTasksRaw(inspectionId)
  return Math.round((done / expected) * 100)
}

export function isInspectionFullyComplete(inspectionId: string): boolean {
  return calcCompletionPct(inspectionId) === 100
}

/** Reset completion notification flag when engineer drops below 100%. */
export function refreshCompletionNotified(inspectionId: string): void {
  const db = getDB()
  const pct = calcCompletionPct(inspectionId)
  if (pct < 100) {
    db.prepare(`UPDATE inspections SET completion_notified = 0 WHERE id = ?`).run(inspectionId)
  }
}

/**
 * Flats marked submitted while still incomplete (legacy / partial submit) are reverted
 * so they do not appear in the Checker queue until truly 100%.
 */
export function repairPartialSubmission(inspectionId: string, flatId: string): void {
  const db = getDB()
  const inspection = db
    .prepare('SELECT status FROM inspections WHERE id = ?')
    .get(inspectionId) as { status: string } | undefined
  if (!inspection || inspection.status !== 'submitted') return

  if (isInspectionFullyComplete(inspectionId)) return

  db.prepare(
    `UPDATE inspections SET status = 'draft', submitted_at = NULL, last_updated = datetime('now') WHERE id = ?`
  ).run(inspectionId)
  db.prepare(
    `UPDATE flats SET status = 'in_progress' WHERE id = ? AND status = 'submitted'`
  ).run(flatId)
}
