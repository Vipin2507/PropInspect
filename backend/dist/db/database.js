"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDB = getDB;
exports.runMigrations = runMigrations;
exports.rowToUser = rowToUser;
exports.rowToProject = rowToProject;
const node_sqlite_1 = require("node:sqlite");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DB_PATH = process.env.DB_PATH || path_1.default.join(__dirname, '../../data/snagdesk.db');
function wrapDatabase(native) {
    return {
        exec(sql) {
            native.exec(sql);
        },
        prepare(sql) {
            const stmt = native.prepare(sql);
            return {
                run: (...params) => stmt.run(...params),
                get: (...params) => stmt.get(...params),
                all: (...params) => stmt.all(...params),
            };
        },
    };
}
let db = null;
/** SQLite via Node built-in module (no native addon; works on Node 22.5+ / 24). */
function getDB() {
    if (!db) {
        const dir = path_1.default.dirname(DB_PATH);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const native = new node_sqlite_1.DatabaseSync(DB_PATH);
        native.exec('PRAGMA journal_mode = WAL');
        native.exec('PRAGMA foreign_keys = ON');
        db = wrapDatabase(native);
        runMigrations(db);
    }
    return db;
}
function runMigrations(database) {
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
  `);
}
function rowToUser(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        mobile: row.mobile,
        role: row.role,
        avatar: row.avatar || undefined,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
    };
}
function rowToProject(row) {
    const towerCount = getDB()
        .prepare('SELECT COUNT(*) as c FROM towers WHERE project_id = ?')
        .get(row.id);
    return {
        id: row.id,
        name: row.name,
        location: row.location,
        developerName: row.developer_name,
        totalTowers: towerCount.c,
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=database.js.map