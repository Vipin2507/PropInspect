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
    const inspectionId = req.query.inspectionId;
    if (!inspectionId) {
        res.status(400).json({ error: 'inspectionId required' });
        return;
    }
    const rows = (0, database_1.getDB)().prepare('SELECT * FROM responses WHERE inspection_id = ?').all(inspectionId);
    const responses = rows.map((r) => {
        const images = (0, database_1.getDB)().prepare('SELECT * FROM images WHERE response_id = ?').all(r.id).map(mappers_1.rowToImage);
        return (0, mappers_1.rowToResponse)(r, images);
    });
    res.json(responses);
}));
router.patch('/:id', (0, requireRole_1.requireRole)('engineer'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z.object({ status: zod_1.z.enum(['pass', 'fail', 'na', 'pending']).optional(), remarks: zod_1.z.string().optional() }).parse(req.body);
    const db = (0, database_1.getDB)();
    const response = db.prepare('SELECT * FROM responses WHERE id = ?').get(req.params.id);
    if (!response) {
        res.status(404).json({ error: 'Response not found' });
        return;
    }
    const inspection = db.prepare('SELECT engineer_id, status FROM inspections WHERE id = ?').get(response.inspection_id);
    if (!inspection || inspection.engineer_id !== req.user.id) {
        res.status(403).json({ error: 'Not authorized' });
        return;
    }
    if (!['draft', 'revision_required'].includes(inspection.status)) {
        res.status(400).json({ error: 'Cannot edit after submission' });
        return;
    }
    db.prepare(`UPDATE responses SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`).run(body.status ?? response.status, body.remarks ?? response.remarks, req.params.id);
    const updated = db.prepare('SELECT * FROM responses WHERE id = ?').get(req.params.id);
    const images = db.prepare('SELECT * FROM images WHERE response_id = ?').all(req.params.id);
    res.json((0, mappers_1.rowToResponse)(updated, images.map(mappers_1.rowToImage)));
}));
exports.default = router;
//# sourceMappingURL=responses.js.map