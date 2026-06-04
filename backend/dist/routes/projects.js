"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const errorHandler_1 = require("../middleware/errorHandler");
const stats_1 = require("../utils/stats");
const params_1 = require("../utils/params");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, requireRole_1.requireRole)('admin', 'viewer'));
router.get('/', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const rows = (0, database_1.getDB)().prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    const projects = rows.map((row) => {
        const p = (0, database_1.rowToProject)(row);
        const stats = (0, stats_1.getProjectStats)(p.id, p.name);
        return { ...p, stats };
    });
    res.json(projects);
}));
router.post('/', (0, requireRole_1.requireRole)('admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z
        .object({ name: zod_1.z.string(), location: zod_1.z.string().optional(), developerName: zod_1.z.string().optional() })
        .parse(req.body);
    const id = (0, uuid_1.v4)();
    (0, database_1.getDB)()
        .prepare(`INSERT INTO projects (id, name, location, developer_name, created_by) VALUES (?, ?, ?, ?, ?)`)
        .run(id, body.name, body.location || '', body.developerName || '', req.user.id);
    const row = (0, database_1.getDB)().prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json((0, database_1.rowToProject)(row));
}));
router.put('/:id', (0, requireRole_1.requireRole)('admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const body = zod_1.z
        .object({
        name: zod_1.z.string().optional(),
        location: zod_1.z.string().optional(),
        developerName: zod_1.z.string().optional(),
        status: zod_1.z.enum(['active', 'completed', 'on_hold']).optional(),
    })
        .parse(req.body);
    const db = (0, database_1.getDB)();
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    const row = existing;
    db.prepare(`UPDATE projects SET name = ?, location = ?, developer_name = ?, status = ?, updated_at = datetime('now') WHERE id = ?`).run(body.name ?? row.name, body.location ?? row.location, body.developerName ?? row.developer_name, body.status ?? row.status, id);
    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json((0, database_1.rowToProject)(updated));
}));
router.delete('/:id', (0, requireRole_1.requireRole)('admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    (0, database_1.getDB)().prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
}));
router.get('/:id/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const row = (0, database_1.getDB)().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    res.json((0, stats_1.getProjectStats)((0, params_1.param)(req, 'id'), row.name));
}));
exports.default = router;
//# sourceMappingURL=projects.js.map