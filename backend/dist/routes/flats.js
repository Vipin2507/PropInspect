"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const errorHandler_1 = require("../middleware/errorHandler");
const mappers_1 = require("../utils/mappers");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { towerId, engineerId, projectId } = req.query;
    const db = (0, database_1.getDB)();
    let rows = [];
    if (engineerId) {
        rows = db
            .prepare(`SELECT f.* FROM flats f
           JOIN assignments a ON a.flat_id = f.id
           WHERE a.engineer_id = ?
           ORDER BY f.flat_number`)
            .all(engineerId);
    }
    else if (towerId) {
        rows = db.prepare('SELECT * FROM flats WHERE tower_id = ? ORDER BY flat_number').all(towerId);
    }
    else if (projectId) {
        rows = db.prepare('SELECT * FROM flats WHERE project_id = ? ORDER BY flat_number').all(projectId);
    }
    else {
        res.status(400).json({ error: 'towerId, engineerId, or projectId required' });
        return;
    }
    const flats = rows.map((row) => enrichFlat(row));
    res.json(flats);
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const row = (0, database_1.getDB)().prepare('SELECT * FROM flats WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json({ error: 'Flat not found' });
        return;
    }
    res.json(enrichFlat(row));
}));
router.patch('/:id/status', (0, requireRole_1.requireRole)('admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status } = zod_1.z
        .object({
        status: zod_1.z.enum([
            'not_started', 'in_progress', 'submitted', 'approved',
            'rejected', 'revision_required', 'desnagging',
        ]),
    })
        .parse(req.body);
    (0, database_1.getDB)().prepare('UPDATE flats SET status = ? WHERE id = ?').run(status, req.params.id);
    const row = (0, database_1.getDB)().prepare('SELECT * FROM flats WHERE id = ?').get(req.params.id);
    res.json(enrichFlat(row));
}));
function enrichFlat(row) {
    const db = (0, database_1.getDB)();
    const assignment = db
        .prepare(`SELECT a.*, e.name as engineer_name, q.name as qa_name
       FROM assignments a
       LEFT JOIN users e ON e.id = a.engineer_id
       LEFT JOIN users q ON q.id = a.qa_id
       WHERE a.flat_id = ?`)
        .get(row.id);
    const tower = db.prepare('SELECT name FROM towers WHERE id = ?').get(row.tower_id);
    const floor = db.prepare('SELECT label FROM floors WHERE id = ?').get(row.floor_id);
    const inspection = db.prepare('SELECT id, status FROM inspections WHERE flat_id = ?').get(row.id);
    return {
        ...(0, mappers_1.rowToFlat)(row),
        towerName: tower?.name,
        floorLabel: floor?.label,
        assignment: assignment
            ? {
                id: assignment.id,
                flatId: assignment.flat_id,
                engineerId: assignment.engineer_id,
                qaId: assignment.qa_id,
                engineerName: assignment.engineer_name,
                qaName: assignment.qa_name,
                assignedAt: assignment.assigned_at,
            }
            : null,
        inspection: inspection || null,
    };
}
exports.default = router;
//# sourceMappingURL=flats.js.map