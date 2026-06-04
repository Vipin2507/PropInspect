"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const rows = (0, database_1.getDB)().prepare('SELECT * FROM checklist_templates ORDER BY is_default DESC, name').all();
    res.json(rows.map(mapTemplate));
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const row = (0, database_1.getDB)().prepare('SELECT * FROM checklist_templates WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json({ error: 'Template not found' });
        return;
    }
    res.json(mapTemplate(row));
}));
router.post('/', (0, requireRole_1.requireRole)('admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z.object({ name: zod_1.z.string(), sections: zod_1.z.array(zod_1.z.unknown()) }).parse(req.body);
    const id = (0, uuid_1.v4)();
    (0, database_1.getDB)()
        .prepare(`INSERT INTO checklist_templates (id, name, sections, created_by) VALUES (?, ?, ?, ?)`)
        .run(id, body.name, JSON.stringify(body.sections), req.user.id);
    const row = (0, database_1.getDB)().prepare('SELECT * FROM checklist_templates WHERE id = ?').get(id);
    res.status(201).json(mapTemplate(row));
}));
router.put('/:id', (0, requireRole_1.requireRole)('admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z.object({ name: zod_1.z.string().optional(), sections: zod_1.z.array(zod_1.z.unknown()).optional() }).parse(req.body);
    const db = (0, database_1.getDB)();
    const row = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json({ error: 'Template not found' });
        return;
    }
    db.prepare(`UPDATE checklist_templates SET name = ?, sections = ?, updated_at = datetime('now') WHERE id = ?`).run(body.name ?? row.name, body.sections ? JSON.stringify(body.sections) : row.sections, req.params.id);
    const updated = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(req.params.id);
    res.json(mapTemplate(updated));
}));
router.delete('/:id', (0, requireRole_1.requireRole)('admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    (0, database_1.getDB)().prepare('DELETE FROM checklist_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
}));
router.post('/:id/set-default', (0, requireRole_1.requireRole)('admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDB)();
    db.prepare('UPDATE checklist_templates SET is_default = 0').run();
    db.prepare('UPDATE checklist_templates SET is_default = 1 WHERE id = ?').run(req.params.id);
    const row = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(req.params.id);
    res.json(mapTemplate(row));
}));
function mapTemplate(row) {
    return {
        id: row.id,
        name: row.name,
        categories: JSON.parse(row.sections),
        isDefault: Boolean(row.is_default),
        createdBy: row.created_by,
        createdAt: row.created_at,
    };
}
exports.default = router;
//# sourceMappingURL=checklists.js.map