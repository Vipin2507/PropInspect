import { v4 as uuidv4 } from 'uuid'
import { getDB, utcTs } from '../db/database'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../constants/checklist'
import { calcCompletionPctFromDb } from './inspectionTasks'

export type TaskChangeType = 'status_change' | 'remarks_change'

export interface TaskChangeLogRow {
  id: string
  flatId: string
  inspectionId: string
  responseId: string
  itemId: string
  categoryId: string
  itemLabel: string
  categoryName: string
  flatNumber: string
  towerName: string
  projectId: string
  changeType: TaskChangeType
  oldValue: string
  newValue: string
  engineerId: string
  engineerName: string
  reviewedAt: string | null
  reviewedBy: string | null
  reviewerName: string | null
  createdAt: string
}

function getItemMeta(itemId: string, categoryId: string) {
  const cat = DEFAULT_CHECKLIST_CATEGORIES.find((c) => c.id === categoryId)
  const item = cat?.items.find((i) => i.id === itemId)
  return {
    itemLabel: item?.label ?? itemId,
    categoryName: cat?.name ?? categoryId,
  }
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

function insertChange(entry: {
  flatId: string
  inspectionId: string
  responseId: string
  itemId: string
  categoryId: string
  changeType: TaskChangeType
  oldValue: string
  newValue: string
  engineerId: string
}): void {
  if (entry.oldValue === entry.newValue) return

  const db = getDB()
  const flatMeta = getFlatMeta(entry.flatId)
  const itemMeta = getItemMeta(entry.itemId, entry.categoryId)
  const engineer = db
    .prepare('SELECT name FROM users WHERE id = ?')
    .get(entry.engineerId) as { name: string } | undefined

  db.prepare(
    `INSERT INTO task_change_log
     (id, flat_id, inspection_id, response_id, item_id, category_id, item_label, category_name,
      flat_number, tower_name, project_id, change_type, old_value, new_value,
      engineer_id, engineer_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    uuidv4(),
    entry.flatId,
    entry.inspectionId,
    entry.responseId,
    entry.itemId,
    entry.categoryId,
    itemMeta.itemLabel,
    itemMeta.categoryName,
    flatMeta.flatNumber,
    flatMeta.towerName,
    flatMeta.projectId,
    entry.changeType,
    entry.oldValue,
    entry.newValue,
    entry.engineerId,
    engineer?.name ?? ''
  )
}

/** Log engineer task updates for QA Changes Log (no notification). */
export function logTaskResponseChange(params: {
  flatId: string
  inspectionId: string
  responseId: string
  itemId: string
  categoryId: string
  engineerId: string
  oldStatus: string
  newStatus: string
  oldRemarks: string
  newRemarks: string
}): void {
  try {
    if (params.oldStatus !== params.newStatus) {
      insertChange({
        flatId: params.flatId,
        inspectionId: params.inspectionId,
        responseId: params.responseId,
        itemId: params.itemId,
        categoryId: params.categoryId,
        engineerId: params.engineerId,
        changeType: 'status_change',
        oldValue: params.oldStatus,
        newValue: params.newStatus,
      })
    }
    const oldR = (params.oldRemarks ?? '').trim()
    const newR = (params.newRemarks ?? '').trim()
    if (oldR !== newR && newR) {
      insertChange({
        flatId: params.flatId,
        inspectionId: params.inspectionId,
        responseId: params.responseId,
        itemId: params.itemId,
        categoryId: params.categoryId,
        engineerId: params.engineerId,
        changeType: 'remarks_change',
        oldValue: oldR,
        newValue: newR,
      })
    }
  } catch {
    // Must not break saves
  }
}

export function countUnreviewedChanges(flatId?: string): number {
  const db = getDB()
  if (flatId) {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM task_change_log WHERE flat_id = ? AND reviewed_at IS NULL`
      )
      .get(flatId) as { c: number }
    return row?.c ?? 0
  }
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM task_change_log WHERE reviewed_at IS NULL`)
    .get() as { c: number }
  return row?.c ?? 0
}

function rowToChange(r: Record<string, unknown>): TaskChangeLogRow {
  return {
    id: r.id as string,
    flatId: r.flat_id as string,
    inspectionId: r.inspection_id as string,
    responseId: r.response_id as string,
    itemId: r.item_id as string,
    categoryId: r.category_id as string,
    itemLabel: r.item_label as string,
    categoryName: r.category_name as string,
    flatNumber: r.flat_number as string,
    towerName: r.tower_name as string,
    projectId: r.project_id as string,
    changeType: r.change_type as TaskChangeType,
    oldValue: r.old_value as string,
    newValue: r.new_value as string,
    engineerId: r.engineer_id as string,
    engineerName: r.engineer_name as string,
    reviewedAt: utcTs(r.reviewed_at as string) ?? null,
    reviewedBy: (r.reviewed_by as string) ?? null,
    reviewerName: (r.reviewer_name as string) ?? null,
    createdAt: utcTs(r.created_at as string) ?? '',
  }
}

export interface FlatChangeGroup {
  flatId: string
  flatNumber: string
  towerName: string
  projectId: string
  engineerName: string
  flatStatus: string
  completionPct: number
  unreviewedCount: number
  lastChangeAt: string
  changes: TaskChangeLogRow[]
}

export function getChangesGrouped(opts: {
  unreviewedOnly?: boolean
  projectId?: string
  towerId?: string
  flatId?: string
  limit?: number
}): FlatChangeGroup[] {
  const db = getDB()
  let sql = `SELECT t.* FROM task_change_log t WHERE 1=1`
  const params: unknown[] = []

  if (opts.unreviewedOnly !== false) {
    sql += ` AND t.reviewed_at IS NULL`
  }
  if (opts.projectId) {
    sql += ` AND t.project_id = ?`
    params.push(opts.projectId)
  }
  if (opts.towerId) {
    sql += ` AND EXISTS (SELECT 1 FROM flats f WHERE f.id = t.flat_id AND f.tower_id = ?)`
    params.push(opts.towerId)
  }
  if (opts.flatId) {
    sql += ` AND t.flat_id = ?`
    params.push(opts.flatId)
  }

  sql += ` ORDER BY datetime(t.created_at) DESC`
  const limit = opts.limit ?? 500
  sql += ` LIMIT ?`
  params.push(limit)

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
  const byFlat = new Map<string, TaskChangeLogRow[]>()

  for (const row of rows) {
    const change = rowToChange(row)
    if (!byFlat.has(change.flatId)) byFlat.set(change.flatId, [])
    byFlat.get(change.flatId)!.push(change)
  }

  const groups: FlatChangeGroup[] = []

  for (const [flatId, changes] of byFlat.entries()) {
    const flat = db
      .prepare(
        `SELECT f.status, f.flat_number, t.name AS tower_name, u.name AS engineer_name
         FROM flats f
         LEFT JOIN towers t ON t.id = f.tower_id
         LEFT JOIN inspections i ON i.flat_id = f.id
         LEFT JOIN users u ON u.id = i.engineer_id
         WHERE f.id = ?`
      )
      .get(flatId) as {
      status: string
      flat_number: string
      tower_name: string
      engineer_name: string
    } | undefined

    const inspection = db
      .prepare('SELECT id FROM inspections WHERE flat_id = ?')
      .get(flatId) as { id: string } | undefined

    let completionPct = 0
    if (inspection) {
      completionPct = calcCompletionPctFromDb(inspection.id)
    }

    const unreviewedCount = changes.filter((c) => !c.reviewedAt).length

    groups.push({
      flatId,
      flatNumber: flat?.flat_number ?? changes[0]?.flatNumber ?? flatId,
      towerName: flat?.tower_name ?? changes[0]?.towerName ?? '',
      projectId: changes[0]?.projectId ?? '',
      engineerName: changes[0]?.engineerName ?? flat?.engineer_name ?? '',
      flatStatus: flat?.status ?? 'in_progress',
      completionPct,
      unreviewedCount,
      lastChangeAt: changes[0]?.createdAt ?? '',
      changes,
    })
  }

  groups.sort(
    (a, b) => new Date(b.lastChangeAt).getTime() - new Date(a.lastChangeAt).getTime()
  )

  return groups
}

export function markChangeReviewed(changeId: string, reviewerId: string): boolean {
  const db = getDB()
  const pending = db
    .prepare('SELECT id FROM task_change_log WHERE id = ? AND reviewed_at IS NULL')
    .get(changeId)
  if (!pending) return false

  const reviewer = db
    .prepare('SELECT name FROM users WHERE id = ?')
    .get(reviewerId) as { name: string } | undefined
  db.prepare(
    `UPDATE task_change_log
     SET reviewed_at = datetime('now'), reviewed_by = ?, reviewer_name = ?
     WHERE id = ? AND reviewed_at IS NULL`
  ).run(reviewerId, reviewer?.name ?? '', changeId)
  return true
}

export function markFlatChangesReviewed(flatId: string, reviewerId: string): number {
  const db = getDB()
  const countRow = db
    .prepare('SELECT COUNT(*) AS c FROM task_change_log WHERE flat_id = ? AND reviewed_at IS NULL')
    .get(flatId) as { c: number } | undefined
  const count = countRow?.c ?? 0
  if (count === 0) return 0

  const reviewer = db
    .prepare('SELECT name FROM users WHERE id = ?')
    .get(reviewerId) as { name: string } | undefined
  db.prepare(
    `UPDATE task_change_log
     SET reviewed_at = datetime('now'), reviewed_by = ?, reviewer_name = ?
     WHERE flat_id = ? AND reviewed_at IS NULL`
  ).run(reviewerId, reviewer?.name ?? '', flatId)
  return count
}
