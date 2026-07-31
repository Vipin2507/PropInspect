import { getDB } from '../db/database'

export const NOTIF_SETTING_DEFAULTS: Record<string, boolean | number> = {
  'notif.enabled': true,
  'notif.engineer_start_flat': true,
  'notif.engineer_resume_flat': true,
  'notif.qa_start_review': true,
  'notif.qa_resume_review': true,
  'notif.existing_submit_review': true,
  'notif.flat_completion': true,
  'notif.qa_task_feedback': true,
  'notif.resume_idle_hours': 4,
  'notif.notify_admins': true,
}

export type NotifSettingKey = keyof typeof NOTIF_SETTING_DEFAULTS

let cache: Record<string, boolean | number> | null = null

function ensureSeeded(): void {
  const db = getDB()
  for (const [key, value] of Object.entries(NOTIF_SETTING_DEFAULTS)) {
    const existing = db.prepare('SELECT key FROM app_settings WHERE key = ?').get(key)
    if (!existing) {
      db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run(
        key,
        JSON.stringify(value)
      )
    }
  }
}

function loadCache(): Record<string, boolean | number> {
  if (cache) return cache
  ensureSeeded()
  const db = getDB()
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as {
    key: string
    value: string
  }[]
  const result: Record<string, boolean | number> = { ...NOTIF_SETTING_DEFAULTS }
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value) as boolean | number
    } catch {
      /* keep default */
    }
  }
  cache = result
  return result
}

export function invalidateSettingsCache(): void {
  cache = null
}

export function getSettings(): Record<string, boolean | number> {
  return { ...loadCache() }
}

export function getSetting(key: string): boolean | number {
  const settings = loadCache()
  if (key in settings) return settings[key]
  return NOTIF_SETTING_DEFAULTS[key] ?? false
}

export function getBoolSetting(key: string, fallback = true): boolean {
  const v = getSetting(key)
  if (typeof v === 'boolean') return v
  return fallback
}

export function getResumeIdleHours(): number {
  const v = getSetting('notif.resume_idle_hours')
  const n = typeof v === 'number' ? v : 4
  return Math.min(24, Math.max(1, n))
}

export function setSettings(patch: Record<string, boolean | number>): Record<string, boolean | number> {
  const db = getDB()
  ensureSeeded()
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in NOTIF_SETTING_DEFAULTS)) continue
    let stored: boolean | number = value
    if (key === 'notif.resume_idle_hours') {
      stored = Math.min(24, Math.max(1, Number(value) || 4))
    } else {
      stored = Boolean(value)
    }
    const existing = db.prepare('SELECT key FROM app_settings WHERE key = ?').get(key)
    if (existing) {
      db.prepare(
        `UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = ?`
      ).run(JSON.stringify(stored), key)
    } else {
      db.prepare(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`
      ).run(key, JSON.stringify(stored))
    }
  }
  invalidateSettingsCache()
  return getSettings()
}

/** Map notification type → settings flag that gates it. */
export function settingKeyForNotifType(type: string): string | null {
  switch (type) {
    case 'inspection_started':
      return 'notif.engineer_start_flat'
    case 'inspection_resumed':
      return 'notif.engineer_resume_flat'
    case 'qa_review_started':
      return 'notif.qa_start_review'
    case 'qa_review_resumed':
      return 'notif.qa_resume_review'
    case 'inspection_submitted':
    case 'inspection_approved':
    case 'inspection_rejected':
    case 'revision_required':
      return 'notif.existing_submit_review'
    case 'flat_completion':
      return 'notif.flat_completion'
    case 'qa_task_revision':
    case 'qa_task_rejected':
      return 'notif.qa_task_feedback'
    default:
      return null
  }
}
