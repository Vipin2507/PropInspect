"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const errorHandler_1 = require("../middleware/errorHandler");
const notifications_1 = require("../utils/notifications");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, requireRole_1.requireRole)('admin'));
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { flatId, engineerId } = req.query;
    const db = (0, database_1.getDB)();
    let rows = [];
    if (flatId) {
        rows = db
            .prepare(`SELECT a.*, e.name as engineer_name, q.name as qa_name FROM assignments a
           LEFT JOIN users e ON e.id = a.engineer_id
           LEFT JOIN users q ON q.id = a.qa_id WHERE a.flat_id = ?`)
            .all(flatId);
    }
    else if (engineerId) {
        rows = db
            .prepare(`SELECT a.*, e.name as engineer_name, q.name as qa_name FROM assignments a
           LEFT JOIN users e ON e.id = a.engineer_id
           LEFT JOIN users q ON q.id = a.qa_id WHERE a.engineer_id = ?`)
            .all(engineerId);
    }
    res.json(rows.map(mapAssignment));
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z.object({ flatId: zod_1.z.string(), engineerId: zod_1.z.string(), qaId: zod_1.z.string() }).parse(req.body);
    const db = (0, database_1.getDB)();
    const existing = db.prepare('SELECT id FROM assignments WHERE flat_id = ?').get(body.flatId);
    if (existing) {
        res.status(400).json({ error: 'Flat already has an assignment' });
        return;
    }
    const id = (0, uuid_1.v4)();
    db.prepare(`INSERT INTO assignments (id, flat_id, engineer_id, qa_id, assigned_by) VALUES (?, ?, ?, ?, ?)`).run(id, body.flatId, body.engineerId, body.qaId, req.user.id);
    const flat = db.prepare('SELECT flat_number FROM flats WHERE id = ?').get(body.flatId);
    (0, notifications_1.createNotification)(body.engineerId, 'snag_assigned', 'Flat Assigned', `You have been assigned flat ${flat.flat_number}`, body.flatId);
    (0, notifications_1.createNotification)(body.qaId, 'snag_assigned', 'Flat Assigned for QA', `Flat ${flat.flat_number} assigned for review`, body.flatId);
    const row = db
        .prepare(`SELECT a.*, e.name as engineer_name, q.name as qa_name FROM assignments a
         LEFT JOIN users e ON e.id = a.engineer_id
         LEFT JOIN users q ON q.id = a.qa_id WHERE a.id = ?`)
        .get(id);
    res.status(201).json(mapAssignment(row));
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z.object({ engineerId: zod_1.z.string().optional(), qaId: zod_1.z.string().optional() }).parse(req.body);
    const db = (0, database_1.getDB)();
    const row = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
    }
    db.prepare(`UPDATE assignments SET engineer_id = ?, qa_id = ? WHERE id = ?`).run(body.engineerId ?? row.engineer_id, body.qaId ?? row.qa_id, req.params.id);
    const updated = db
        .prepare(`SELECT a.*, e.name as engineer_name, q.name as qa_name FROM assignments a
         LEFT JOIN users e ON e.id = a.engineer_id
         LEFT JOIN users q ON q.id = a.qa_id WHERE a.id = ?`)
        .get(req.params.id);
    res.json(mapAssignment(updated));
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    (0, database_1.getDB)().prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
}));
function mapAssignment(row) {
    return {
        id: row.id,
        flatId: row.flat_id,
        engineerId: row.engineer_id,
        qaId: row.qa_id,
        assignedBy: row.assigned_by,
        assignedAt: row.assigned_at,
        engineerName: row.engineer_name,
        qaName: row.qa_name,
    };
}
exports.default = router;
//# sourceMappingURL=assignments.js.map