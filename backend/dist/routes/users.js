"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, requireRole_1.requireRole)('admin'));
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const role = req.query.role;
    const db = (0, database_1.getDB)();
    const rows = role
        ? db.prepare('SELECT * FROM users WHERE role = ? ORDER BY name').all(role)
        : db.prepare('SELECT * FROM users ORDER BY name').all();
    res.json(rows.map(database_1.rowToUser));
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z
        .object({
        name: zod_1.z.string(),
        email: zod_1.z.string().email(),
        mobile: zod_1.z.string(),
        password: zod_1.z.string().min(6),
        role: zod_1.z.enum(['admin', 'engineer', 'qa', 'viewer']),
    })
        .parse(req.body);
    const id = (0, uuid_1.v4)();
    const hash = bcryptjs_1.default.hashSync(body.password, 10);
    (0, database_1.getDB)()
        .prepare(`INSERT INTO users (id, name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, body.name, body.email, body.mobile, hash, body.role);
    const row = (0, database_1.getDB)().prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json((0, database_1.rowToUser)(row));
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z
        .object({
        name: zod_1.z.string().optional(),
        email: zod_1.z.string().email().optional(),
        mobile: zod_1.z.string().optional(),
        role: zod_1.z.enum(['admin', 'engineer', 'qa', 'viewer']).optional(),
    })
        .parse(req.body);
    const db = (0, database_1.getDB)();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    db.prepare(`UPDATE users SET name = ?, email = ?, mobile = ?, role = ?, updated_at = datetime('now') WHERE id = ?`).run(body.name ?? row.name, body.email ?? row.email, body.mobile ?? row.mobile, body.role ?? row.role, req.params.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json((0, database_1.rowToUser)(updated));
}));
router.patch('/:id/password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { newPassword } = zod_1.z.object({ newPassword: zod_1.z.string().min(6) }).parse(req.body);
    const hash = bcryptjs_1.default.hashSync(newPassword, 10);
    (0, database_1.getDB)().prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?').run(hash, req.params.id);
    res.json({ success: true });
}));
router.patch('/:id/toggle-active', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDB)();
    const row = db.prepare('SELECT is_active FROM users WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    db.prepare('UPDATE users SET is_active = ?, updated_at = datetime("now") WHERE id = ?').run(row.is_active ? 0 : 1, req.params.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json((0, database_1.rowToUser)(updated));
}));
router.get('/:id/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDB)();
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    const assigned = db.prepare('SELECT COUNT(*) as c FROM assignments WHERE engineer_id = ?').get(req.params.id).c;
    const submitted = db.prepare(`SELECT COUNT(*) as c FROM inspections WHERE engineer_id = ? AND status != 'draft'`).get(req.params.id).c;
    const approved = db.prepare(`SELECT COUNT(*) as c FROM inspections WHERE engineer_id = ? AND status = 'approved'`).get(req.params.id).c;
    const rejected = db.prepare(`SELECT COUNT(*) as c FROM inspections WHERE engineer_id = ? AND status = 'rejected'`).get(req.params.id).c;
    res.json({ engineerId: req.params.id, name: user.name, assigned, submitted, approved, rejected });
}));
exports.default = router;
//# sourceMappingURL=users.js.map