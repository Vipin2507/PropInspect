"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const errorHandler_1 = require("../middleware/errorHandler");
const mappers_1 = require("../utils/mappers");
const notifications_1 = require("../utils/notifications");
const params_1 = require("../utils/params");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
function loadSnag(id) {
    const row = (0, database_1.getDB)().prepare('SELECT * FROM snags WHERE id = ?').get(id);
    if (!row)
        return null;
    const db = (0, database_1.getDB)();
    const before = db.prepare(`SELECT * FROM images WHERE snag_id = ? AND type = 'before'`).all(id).map(mappers_1.rowToImage);
    const after = db.prepare(`SELECT * FROM images WHERE snag_id = ? AND type = 'after'`).all(id).map(mappers_1.rowToImage);
    const evidenceBefore = db.prepare(`SELECT * FROM images WHERE response_id = ?`).all(row.response_id).map(mappers_1.rowToImage);
    return (0, mappers_1.rowToSnag)(row, [...evidenceBefore, ...before], after);
}
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { inspectionId, flatId, projectId } = req.query;
    const db = (0, database_1.getDB)();
    let rows = [];
    if (inspectionId)
        rows = db.prepare('SELECT * FROM snags WHERE inspection_id = ?').all(inspectionId);
    else if (flatId)
        rows = db.prepare('SELECT * FROM snags WHERE flat_id = ?').all(flatId);
    else if (projectId)
        rows = db.prepare('SELECT * FROM snags WHERE project_id = ?').all(projectId);
    else {
        res.status(400).json({ error: 'inspectionId, flatId, or projectId required' });
        return;
    }
    res.json(rows.map((r) => loadSnag(r.id)).filter(Boolean));
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const snag = loadSnag((0, params_1.param)(req, 'id'));
    if (!snag) {
        res.status(404).json({ error: 'Snag not found' });
        return;
    }
    res.json(snag);
}));
router.post('/', (0, requireRole_1.requireRole)('engineer', 'admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z
        .object({
        responseId: zod_1.z.string(),
        inspectionId: zod_1.z.string(),
        flatId: zod_1.z.string(),
        projectId: zod_1.z.string(),
        category: zod_1.z.string(),
        itemLabel: zod_1.z.string(),
        description: zod_1.z.string(),
        severity: zod_1.z.enum(['critical', 'major', 'minor']),
    })
        .parse(req.body);
    const id = (0, uuid_1.v4)();
    (0, database_1.getDB)()
        .prepare(`INSERT INTO snags (id, inspection_id, response_id, flat_id, project_id, category, item_label, description, severity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, body.inspectionId, body.responseId, body.flatId, body.projectId, body.category, body.itemLabel, body.description, body.severity);
    (0, database_1.getDB)().prepare('UPDATE responses SET snag_id = ? WHERE id = ?').run(id, body.responseId);
    res.status(201).json(loadSnag(id));
}));
router.patch('/:id', (0, requireRole_1.requireRole)('qa', 'admin', 'engineer'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z
        .object({
        status: zod_1.z.enum(['open', 'assigned', 'in_rectification', 'rectified', 'verified', 'closed', 'rejected']).optional(),
        assignedTo: zod_1.z.string().optional(),
        remarks: zod_1.z.string().optional(),
    })
        .parse(req.body);
    const db = (0, database_1.getDB)();
    const row = db.prepare('SELECT * FROM snags WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json({ error: 'Snag not found' });
        return;
    }
    db.prepare(`UPDATE snags SET status = ?, assigned_to = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`).run(body.status ?? row.status, body.assignedTo ?? row.assigned_to, body.remarks ?? row.remarks, (0, params_1.param)(req, 'id'));
    res.json(loadSnag((0, params_1.param)(req, 'id')));
}));
router.post('/:id/rectify', (0, requireRole_1.requireRole)('engineer'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z.object({ remarks: zod_1.z.string(), afterImages: zod_1.z.array(zod_1.z.string()).optional() }).parse(req.body);
    const db = (0, database_1.getDB)();
    const snagId = (0, params_1.param)(req, 'id');
    db.prepare(`UPDATE snags SET status = 'rectified', remarks = ?, updated_at = datetime('now') WHERE id = ?`).run(body.remarks, snagId);
    if (body.afterImages) {
        for (const url of body.afterImages) {
            db.prepare(`INSERT INTO images (id, inspection_id, snag_id, type, url) 
           SELECT ?, inspection_id, ?, 'after', ? FROM snags WHERE id = ?`).run((0, uuid_1.v4)(), snagId, url, snagId);
        }
    }
    const snag = db.prepare('SELECT flat_id, project_id FROM snags WHERE id = ?').get(snagId);
    const assignment = db.prepare('SELECT qa_id FROM assignments WHERE flat_id = ?').get(snag.flat_id);
    if (assignment) {
        (0, notifications_1.createNotification)(assignment.qa_id, 'snag_rectified', 'Snag Rectified', 'A snag has been marked rectified and needs verification', snagId);
    }
    res.json(loadSnag(snagId));
}));
router.post('/:id/verify-close', (0, requireRole_1.requireRole)('qa', 'admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z.object({ approved: zod_1.z.boolean(), comments: zod_1.z.string().optional() }).parse(req.body);
    const db = (0, database_1.getDB)();
    const snagId = (0, params_1.param)(req, 'id');
    if (body.approved) {
        db.prepare(`UPDATE snags SET status = 'closed', closed_at = datetime('now'), remarks = ?, updated_at = datetime('now') WHERE id = ?`).run(body.comments || '', snagId);
    }
    else {
        db.prepare(`UPDATE snags SET status = 'open', updated_at = datetime('now') WHERE id = ?`).run(snagId);
    }
    res.json(loadSnag(snagId));
}));
exports.default = router;
//# sourceMappingURL=snags.js.map