import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import path from 'path'
import fs from 'fs'

/** Append 'Z' to SQLite UTC timestamps that lack a timezone suffix.
 *  SQLite datetime('now') returns "2024-06-05 00:09:00" — without Z,
 *  JS Date parses it as local time instead of UTC. */
export function utcTs(ts: unknown): string | undefined {
  if (!ts) return undefined
  const s = String(ts)
  if (s.endsWith('Z') || s.includes('+')) return s
  return s.replace(' ', 'T') + 'Z'
}

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/snagdesk.db')

export interface SnagDeskDatabase {
  exec(sql: string): void
  prepare(sql: string): {
    run: (...params: unknown[]) => void
    get: (...params: unknown[]) => Record<string, unknown> | undefined
    all: (...params: unknown[]) => Record<string, unknown>[]
  }
}

function wrapDatabase(native: DatabaseSync): SnagDeskDatabase {
  return {
    exec(sql: string) {
      native.exec(sql)
    },
    prepare(sql: string) {
      const stmt = native.prepare(sql)
      return {
        run: (...params: unknown[]) => stmt.run(...(params as SQLInputValue[])),
        get: (...params: unknown[]) =>
          stmt.get(...(params as SQLInputValue[])) as Record<string, unknown> | undefined,
        all: (...params: unknown[]) =>
          stmt.all(...(params as SQLInputValue[])) as Record<string, unknown>[],
      }
    },
  }
}

let db: SnagDeskDatabase | null = null

/** SQLite via Node built-in module (no native addon; works on Node 22.5+ / 24). */
export function getDB(): SnagDeskDatabase {
  if (!db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const native = new DatabaseSync(DB_PATH)
    native.exec('PRAGMA journal_mode = WAL')
    native.exec('PRAGMA foreign_keys = ON')
    db = wrapDatabase(native)
    runMigrations(db)
  }
  return db
}

export function runMigrations(database: SnagDeskDatabase): void {
  // Additive column migrations — safe to run on existing DBs
  const additiveMigrations = [
    `ALTER TABLE responses ADD COLUMN qa_decision TEXT CHECK(qa_decision IN ('approved','rejected','revision_required'))`,
    `ALTER TABLE inspections ADD COLUMN completion_notified INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE inspections ADD COLUMN last_engineer_activity_at TEXT`,
    `ALTER TABLE inspections ADD COLUMN last_qa_activity_at TEXT`,
    `ALTER TABLE inspections ADD COLUMN qa_review_started_at TEXT`,
  ]
  for (const sql of additiveMigrations) {
    try { database.exec(sql) } catch { /* column already exists */ }
  }

  // Migrate flats status CHECK to include handed_over (SQLite workaround)
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS _flats_status_migration (done INTEGER DEFAULT 0);
    `)
    const done = database.prepare('SELECT done FROM _flats_status_migration LIMIT 1').get() as { done: number } | undefined
    if (!done) {
      // SQLite can't ALTER CHECK constraints — we recreate the table
      database.exec(`
        CREATE TABLE IF NOT EXISTS flats_new (
          id           TEXT PRIMARY KEY,
          tower_id     TEXT NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
          project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          floor_id     TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
          flat_number  TEXT NOT NULL,
          floor        INTEGER NOT NULL,
          status       TEXT NOT NULL DEFAULT 'not_started'
                         CHECK(status IN (
                           'not_started','in_progress','submitted',
                           'approved','rejected','revision_required',
                           'desnagging','handed_over'
                         )),
          created_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO flats_new SELECT * FROM flats;
        DROP TABLE flats;
        ALTER TABLE flats_new RENAME TO flats;
        CREATE INDEX IF NOT EXISTS idx_flats_tower   ON flats(tower_id);
        CREATE INDEX IF NOT EXISTS idx_flats_project ON flats(project_id);
        CREATE INDEX IF NOT EXISTS idx_flats_floor   ON flats(floor_id);
        CREATE INDEX IF NOT EXISTS idx_flats_status  ON flats(status);
        INSERT INTO _flats_status_migration (done) VALUES (1);
      `)
    }
  } catch { /* already migrated */ }

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      mobile      TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('admin','engineer','qa','viewer')),
      avatar      TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      location        TEXT NOT NULL DEFAULT '',
      developer_name  TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'active'
                        CHECK(status IN ('active','completed','on_hold')),
      created_by      TEXT NOT NULL REFERENCES users(id),
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS towers (
      id               TEXT PRIMARY KEY,
      project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name             TEXT NOT NULL,
      total_floors     INTEGER NOT NULL DEFAULT 1,
      units_per_floor  INTEGER NOT NULL DEFAULT 1,
      unit_prefix      TEXT NOT NULL DEFAULT '',
      start_number     INTEGER NOT NULL DEFAULT 101,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_towers_project ON towers(project_id);

    CREATE TABLE IF NOT EXISTS floors (
      id           TEXT PRIMARY KEY,
      tower_id     TEXT NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
      project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      floor_number INTEGER NOT NULL,
      label        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_floors_tower ON floors(tower_id);

    CREATE TABLE IF NOT EXISTS flats (
      id           TEXT PRIMARY KEY,
      tower_id     TEXT NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
      project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      floor_id     TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
      flat_number  TEXT NOT NULL,
      floor        INTEGER NOT NULL,
      status       TEXT NOT NULL DEFAULT 'not_started'
                     CHECK(status IN (
                       'not_started','in_progress','submitted',
                       'approved','rejected','revision_required','desnagging'
                     )),
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_flats_tower   ON flats(tower_id);
    CREATE INDEX IF NOT EXISTS idx_flats_project ON flats(project_id);
    CREATE INDEX IF NOT EXISTS idx_flats_floor   ON flats(floor_id);
    CREATE INDEX IF NOT EXISTS idx_flats_status  ON flats(status);

    CREATE TABLE IF NOT EXISTS assignments (
      id           TEXT PRIMARY KEY,
      flat_id      TEXT NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
      engineer_id  TEXT NOT NULL REFERENCES users(id),
      qa_id        TEXT NOT NULL REFERENCES users(id),
      assigned_by  TEXT NOT NULL REFERENCES users(id),
      assigned_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(flat_id)
    );
    CREATE INDEX IF NOT EXISTS idx_assignments_engineer ON assignments(engineer_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_qa       ON assignments(qa_id);

    CREATE TABLE IF NOT EXISTS checklist_templates (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      sections    TEXT NOT NULL DEFAULT '[]',
      is_default  INTEGER NOT NULL DEFAULT 0,
      created_by  TEXT NOT NULL REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id            TEXT PRIMARY KEY,
      flat_id       TEXT NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
      project_id    TEXT NOT NULL REFERENCES projects(id),
      tower_id      TEXT NOT NULL REFERENCES towers(id),
      floor_id      TEXT NOT NULL REFERENCES floors(id),
      engineer_id   TEXT NOT NULL REFERENCES users(id),
      template_id   TEXT NOT NULL REFERENCES checklist_templates(id),
      status        TEXT NOT NULL DEFAULT 'draft'
                      CHECK(status IN (
                        'draft','submitted','approved',
                        'rejected','revision_required'
                      )),
      submitted_at  TEXT,
      last_updated  TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at     TEXT,
      UNIQUE(flat_id)
    );
    CREATE INDEX IF NOT EXISTS idx_inspections_flat     ON inspections(flat_id);
    CREATE INDEX IF NOT EXISTS idx_inspections_engineer ON inspections(engineer_id);
    CREATE INDEX IF NOT EXISTS idx_inspections_project  ON inspections(project_id);
    CREATE INDEX IF NOT EXISTS idx_inspections_status   ON inspections(status);

    CREATE TABLE IF NOT EXISTS responses (
      id              TEXT PRIMARY KEY,
      inspection_id   TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      item_id         TEXT NOT NULL,
      category_id     TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pass','fail','na','pending')),
      remarks         TEXT NOT NULL DEFAULT '',
      qa_remarks      TEXT NOT NULL DEFAULT '',
      snag_id         TEXT,
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(inspection_id, item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_responses_inspection ON responses(inspection_id);
    CREATE INDEX IF NOT EXISTS idx_responses_status     ON responses(status);

    CREATE TABLE IF NOT EXISTS snags (
      id              TEXT PRIMARY KEY,
      inspection_id   TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      response_id     TEXT NOT NULL REFERENCES responses(id),
      flat_id         TEXT NOT NULL REFERENCES flats(id),
      project_id      TEXT NOT NULL REFERENCES projects(id),
      category        TEXT NOT NULL,
      item_label      TEXT NOT NULL,
      description     TEXT NOT NULL DEFAULT '',
      severity        TEXT NOT NULL DEFAULT 'minor'
                        CHECK(severity IN ('critical','major','minor')),
      status          TEXT NOT NULL DEFAULT 'open'
                        CHECK(status IN (
                          'open','assigned','in_rectification',
                          'rectified','verified','closed','rejected'
                        )),
      assigned_to     TEXT,
      remarks         TEXT NOT NULL DEFAULT '',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at       TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_snags_inspection ON snags(inspection_id);
    CREATE INDEX IF NOT EXISTS idx_snags_flat       ON snags(flat_id);
    CREATE INDEX IF NOT EXISTS idx_snags_project    ON snags(project_id);
    CREATE INDEX IF NOT EXISTS idx_snags_status     ON snags(status);

    CREATE TABLE IF NOT EXISTS images (
      id              TEXT PRIMARY KEY,
      inspection_id   TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      response_id     TEXT REFERENCES responses(id) ON DELETE CASCADE,
      snag_id         TEXT REFERENCES snags(id) ON DELETE CASCADE,
      item_id         TEXT,
      type            TEXT NOT NULL DEFAULT 'evidence'
                        CHECK(type IN ('before','after','evidence')),
      url             TEXT NOT NULL,
      thumbnail_url   TEXT,
      caption         TEXT NOT NULL DEFAULT '',
      uploaded_at     TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at       TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_images_inspection ON images(inspection_id);
    CREATE INDEX IF NOT EXISTS idx_images_response   ON images(response_id);
    CREATE INDEX IF NOT EXISTS idx_images_snag       ON images(snag_id);

    CREATE TABLE IF NOT EXISTS reviews (
      id               TEXT PRIMARY KEY,
      inspection_id    TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      flat_id          TEXT NOT NULL REFERENCES flats(id),
      qa_id            TEXT NOT NULL REFERENCES users(id),
      decision         TEXT NOT NULL
                         CHECK(decision IN ('approved','rejected','revision_required')),
      overall_comments TEXT NOT NULL DEFAULT '',
      item_comments    TEXT NOT NULL DEFAULT '{}',
      reviewed_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_inspection ON reviews(inspection_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_qa         ON reviews(qa_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      message     TEXT NOT NULL,
      related_id  TEXT NOT NULL DEFAULT '',
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user   ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notif_read   ON notifications(is_read);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      action      TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id   TEXT NOT NULL,
      changes     TEXT NOT NULL DEFAULT '{}',
      ip_address  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS flat_history (
      id          TEXT PRIMARY KEY,
      flat_id     TEXT NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
      event_type  TEXT NOT NULL,
      actor_id    TEXT REFERENCES users(id),
      actor_name  TEXT,
      actor_role  TEXT,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      metadata    TEXT NOT NULL DEFAULT '{}',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_flat_history_flat    ON flat_history(flat_id);
    CREATE INDEX IF NOT EXISTS idx_flat_history_created ON flat_history(flat_id, created_at);

    CREATE TABLE IF NOT EXISTS task_change_log (
      id            TEXT PRIMARY KEY,
      flat_id       TEXT NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
      inspection_id TEXT NOT NULL,
      response_id   TEXT NOT NULL,
      item_id       TEXT NOT NULL,
      category_id   TEXT NOT NULL,
      item_label    TEXT NOT NULL,
      category_name TEXT NOT NULL DEFAULT '',
      flat_number   TEXT NOT NULL DEFAULT '',
      tower_name    TEXT NOT NULL DEFAULT '',
      project_id    TEXT NOT NULL DEFAULT '',
      change_type   TEXT NOT NULL CHECK(change_type IN ('status_change','remarks_change')),
      old_value     TEXT NOT NULL DEFAULT '',
      new_value     TEXT NOT NULL DEFAULT '',
      engineer_id   TEXT NOT NULL REFERENCES users(id),
      engineer_name TEXT NOT NULL DEFAULT '',
      reviewed_at   TEXT,
      reviewed_by   TEXT REFERENCES users(id),
      reviewer_name TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_task_change_flat     ON task_change_log(flat_id);
    CREATE INDEX IF NOT EXISTS idx_task_change_reviewed ON task_change_log(reviewed_at);
    CREATE INDEX IF NOT EXISTS idx_task_change_created  ON task_change_log(created_at);

    CREATE TABLE IF NOT EXISTS engineer_feedback_log (
      id            TEXT PRIMARY KEY,
      flat_id       TEXT NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
      inspection_id TEXT NOT NULL,
      response_id   TEXT NOT NULL,
      item_id       TEXT NOT NULL,
      item_label    TEXT NOT NULL,
      category_name TEXT NOT NULL DEFAULT '',
      flat_number   TEXT NOT NULL DEFAULT '',
      tower_name    TEXT NOT NULL DEFAULT '',
      project_id    TEXT NOT NULL DEFAULT '',
      engineer_id   TEXT NOT NULL REFERENCES users(id),
      qa_id         TEXT NOT NULL REFERENCES users(id),
      qa_name       TEXT NOT NULL DEFAULT '',
      feedback_type TEXT NOT NULL CHECK(feedback_type IN ('revision_required','rejected','approved')),
      remark        TEXT NOT NULL DEFAULT '',
      seen_at       TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_eng_feedback_engineer ON engineer_feedback_log(engineer_id, seen_at);
    CREATE INDEX IF NOT EXISTS idx_eng_feedback_flat     ON engineer_feedback_log(flat_id);
    CREATE INDEX IF NOT EXISTS idx_eng_feedback_created  ON engineer_feedback_log(created_at);

    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

export function rowToUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    avatar: row.avatar || undefined,
    isActive: Boolean(row.is_active),
    createdAt: utcTs(row.created_at),
  }
}

export function rowToProject(row: Record<string, unknown>) {
  const towerCount = getDB()
    .prepare('SELECT COUNT(*) as c FROM towers WHERE project_id = ?')
    .get(row.id as string) as { c: number }
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    developerName: row.developer_name,
    totalTowers: towerCount.c,
    status: row.status,
    createdBy: row.created_by,
    createdAt: utcTs(row.created_at),
    updatedAt: utcTs(row.updated_at),
  }
}
