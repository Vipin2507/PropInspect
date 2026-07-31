import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'
import {
  getBoolSetting,
  getResumeIdleHours,
  settingKeyForNotifType,
} from './appSettings'
import { logFlatHistory } from './flatHistory'

const DEDUP_MINUTES = 30

export function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedId = ''
): void {
  try {
    if (!getBoolSetting('notif.enabled', true)) return

    const flag = settingKeyForNotifType(type)
    if (flag && !getBoolSetting(flag, true)) return

    // Dedup: same user + type + related within window
    if (relatedId) {
      const recent = getDB()
        .prepare(
          `SELECT id FROM notifications
           WHERE user_id = ? AND type = ? AND related_id = ?
             AND datetime(created_at) > datetime('now', ?)
           LIMIT 1`
        )
        .get(userId, type, relatedId, `-${DEDUP_MINUTES} minutes`)
      if (recent) return
    }

    getDB()
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(uuidv4(), userId, type, title, message, relatedId)
  } catch {
    // Notification failure must never break the main workflow
  }
}

export function createNotifications(
  userIds: string[],
  type: string,
  title: string,
  message: string,
  relatedId = ''
): void {
  for (const userId of userIds) {
    createNotification(userId, type, title, message, relatedId)
  }
}

function activeUserIds(role: 'qa' | 'admin'): string[] {
  return (
    getDB()
      .prepare(`SELECT id FROM users WHERE role = ? AND is_active = 1`)
      .all(role) as { id: string }[]
  ).map((u) => u.id)
}

/** Notify all active QA (+ admins if setting on). */
export function notifyQaAndAdmins(
  type: string,
  title: string,
  message: string,
  relatedId = ''
): void {
  const ids = activeUserIds('qa')
  if (getBoolSetting('notif.notify_admins', true)) {
    ids.push(...activeUserIds('admin'))
  }
  createNotifications([...new Set(ids)], type, title, message, relatedId)
}

export function notifyEngineerAndAdmins(
  engineerId: string,
  type: string,
  title: string,
  message: string,
  relatedId = ''
): void {
  const ids = [engineerId]
  if (getBoolSetting('notif.notify_admins', true)) {
    ids.push(...activeUserIds('admin'))
  }
  createNotifications([...new Set(ids)], type, title, message, relatedId)
}

function hoursSince(isoOrSqlite: string | null | undefined): number | null {
  if (!isoOrSqlite) return null
  const s = String(isoOrSqlite).includes('T')
    ? String(isoOrSqlite)
    : String(isoOrSqlite).replace(' ', 'T') + 'Z'
  const t = new Date(s).getTime()
  if (Number.isNaN(t)) return null
  return (Date.now() - t) / (1000 * 60 * 60)
}

function flatLabel(flatId: string): { flatNumber: string; towerName: string } {
  const row = getDB()
    .prepare(
      `SELECT f.flat_number, t.name AS tower_name
       FROM flats f LEFT JOIN towers t ON t.id = f.tower_id WHERE f.id = ?`
    )
    .get(flatId) as { flat_number: string; tower_name: string } | undefined
  return {
    flatNumber: row?.flat_number ?? flatId,
    towerName: row?.tower_name ?? '',
  }
}

function actorName(userId: string): string {
  const row = getDB()
    .prepare('SELECT name FROM users WHERE id = ?')
    .get(userId) as { name: string } | undefined
  return row?.name ?? 'User'
}

/**
 * Record engineer activity; fire resume notification if idle long enough.
 * Call after successful engineer saves.
 */
export function touchEngineerActivity(params: {
  inspectionId: string
  flatId: string
  engineerId: string
}): void {
  try {
    const db = getDB()
    const row = db
      .prepare(
        `SELECT last_engineer_activity_at FROM inspections WHERE id = ?`
      )
      .get(params.inspectionId) as { last_engineer_activity_at: string | null } | undefined
    if (!row) return

    const idle = hoursSince(row.last_engineer_activity_at)
    const threshold = getResumeIdleHours()

    if (idle !== null && idle >= threshold) {
      const { flatNumber, towerName } = flatLabel(params.flatId)
      const name = actorName(params.engineerId)
      const place = towerName ? `${flatNumber} (${towerName})` : flatNumber
      notifyQaAndAdmins(
        'inspection_resumed',
        'Inspection resumed',
        `${name} resumed work on Flat ${place} after ${Math.floor(idle)}h idle.`,
        params.flatId
      )
      logFlatHistory({
        flatId: params.flatId,
        eventType: 'inspection_resumed',
        actorId: params.engineerId,
        title: 'Inspection resumed',
        description: `${name} resumed snagging after ${Math.floor(idle)} hours idle.`,
        metadata: { inspectionId: params.inspectionId, idleHours: Math.floor(idle) },
      })
    }

    db.prepare(
      `UPDATE inspections
       SET last_engineer_activity_at = datetime('now'), last_updated = datetime('now')
       WHERE id = ?`
    ).run(params.inspectionId)
  } catch {
    /* never break saves */
  }
}

/**
 * QA opened / worked on a review. First open → start; idle resume → resume.
 */
export function touchQaActivity(params: {
  inspectionId: string
  flatId: string
  engineerId: string
  qaId: string
}): { started: boolean; resumed: boolean } {
  const result = { started: false, resumed: false }
  try {
    const db = getDB()
    const row = db
      .prepare(
        `SELECT qa_review_started_at, last_qa_activity_at FROM inspections WHERE id = ?`
      )
      .get(params.inspectionId) as {
      qa_review_started_at: string | null
      last_qa_activity_at: string | null
    } | undefined
    if (!row) return result

    const { flatNumber, towerName } = flatLabel(params.flatId)
    const name = actorName(params.qaId)
    const place = towerName ? `${flatNumber} (${towerName})` : flatNumber
    const threshold = getResumeIdleHours()

    if (!row.qa_review_started_at) {
      db.prepare(
        `UPDATE inspections
         SET qa_review_started_at = datetime('now'),
             last_qa_activity_at = datetime('now'),
             last_updated = datetime('now')
         WHERE id = ?`
      ).run(params.inspectionId)

      notifyEngineerAndAdmins(
        params.engineerId,
        'qa_review_started',
        'QA started review',
        `${name} started reviewing Flat ${place}.`,
        params.flatId
      )
      logFlatHistory({
        flatId: params.flatId,
        eventType: 'qa_review_started',
        actorId: params.qaId,
        title: 'QA started review',
        description: `${name} began reviewing this flat.`,
        metadata: { inspectionId: params.inspectionId },
      })
      result.started = true
      return result
    }

    const idle = hoursSince(row.last_qa_activity_at)
    if (idle !== null && idle >= threshold) {
      notifyEngineerAndAdmins(
        params.engineerId,
        'qa_review_resumed',
        'QA resumed review',
        `${name} resumed reviewing Flat ${place} after ${Math.floor(idle)}h idle.`,
        params.flatId
      )
      logFlatHistory({
        flatId: params.flatId,
        eventType: 'qa_review_resumed',
        actorId: params.qaId,
        title: 'QA resumed review',
        description: `${name} resumed review after ${Math.floor(idle)} hours idle.`,
        metadata: { inspectionId: params.inspectionId, idleHours: Math.floor(idle) },
      })
      result.resumed = true
    }

    db.prepare(
      `UPDATE inspections
       SET last_qa_activity_at = datetime('now'), last_updated = datetime('now')
       WHERE id = ?`
    ).run(params.inspectionId)
  } catch {
    /* ignore */
  }
  return result
}

export function notifyInspectionStarted(params: {
  flatId: string
  engineerId: string
  inspectionId: string
}): void {
  try {
    const { flatNumber, towerName } = flatLabel(params.flatId)
    const name = actorName(params.engineerId)
    const place = towerName ? `${flatNumber} (${towerName})` : flatNumber
    notifyQaAndAdmins(
      'inspection_started',
      'Inspection started',
      `${name} started Flat ${place}.`,
      params.flatId
    )
    getDB()
      .prepare(
        `UPDATE inspections
         SET last_engineer_activity_at = datetime('now')
         WHERE id = ?`
      )
      .run(params.inspectionId)
  } catch {
    /* ignore */
  }
}
