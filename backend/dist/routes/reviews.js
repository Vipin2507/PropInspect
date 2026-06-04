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
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/queue', (0, requireRole_1.requireRole)('qa'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const filter = req.query.filter;
    const db = (0, database_1.getDB)();
    let sql = `
      SELECT i.*, f.flat_number, t.name as tower_name, p.name as project_name, u.name as engineer_name
      FROM inspections i
      JOIN flats f ON f.id = i.flat_id
      JOIN towers t ON t.id = i.tower_id
      JOIN projects p ON p.id = i.project_id
      JOIN users u ON u.id = i.engineer_id
      JOIN assignments a ON a.flat_id = i.flat_id
      WHERE i.status = 'submitted' AND a.qa_id = ?
    `;
    if (filter === 'today') {
        sql += ` AND date(i.submitted_at) = date('now')`;
    }
    else if (filter === 'overdue') {
        sql += ` AND datetime(i.submitted_at) < datetime('now', '-2 days')`;
    }
    sql += ` ORDER BY i.submitted_at DESC`;
    const rows = db.prepare(sql).all(req.user.id);
    res.json(rows.map((r) => ({
        inspectionId: r.id,
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        towerName: r.tower_name,
        projectName: r.project_name,
        engineerName: r.engineer_name,
        submittedAt: r.submitted_at,
        status: r.status,
    })));
}));
router.get('/history/list', (0, requireRole_1.requireRole)('qa'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const rows = (0, database_1.getDB)()
        .prepare(`SELECT r.*, f.flat_number FROM reviews r
         JOIN flats f ON f.id = r.flat_id
         WHERE r.qa_id = ? ORDER BY r.reviewed_at DESC LIMIT 50`)
        .all(req.user.id);
    res.json(rows.map((r) => ({
        id: r.id,
        inspectionId: r.inspection_id,
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        qaId: r.qa_id,
        decision: r.decision,
        overallComments: r.overall_comments,
        itemComments: JSON.parse(r.item_comments),
        reviewedAt: r.reviewed_at,
    })));
}));
router.get('/:inspectionId', (0, requireRole_1.requireRole)('qa', 'admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDB)();
    const row = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.inspectionId);
    if (!row) {
        res.status(404).json({ error: 'Inspection not found' });
        return;
    }
    const responses = db.prepare('SELECT * FROM responses WHERE inspection_id = ?').all(req.params.inspectionId).map((r) => {
        const images = db.prepare('SELECT * FROM images WHERE response_id = ?').all(r.id).map(mappers_1.rowToImage);
        return (0, mappers_1.rowToResponse)(r, images);
    });
    const snags = db.prepare('SELECT * FROM snags WHERE inspection_id = ?').all(req.params.inspectionId).map((s) => (0, mappers_1.rowToSnag)(s, [], []));
    const flat = db.prepare('SELECT flat_number FROM flats WHERE id = ?').get(row.flat_id);
    const engineer = db.prepare('SELECT name FROM users WHERE id = ?').get(row.engineer_id);
    res.json({
        inspection: { ...(0, mappers_1.rowToInspection)(row), responses },
        snags,
        flatNumber: flat.flat_number,
        engineerName: engineer.name,
    });
}));
router.post('/', (0, requireRole_1.requireRole)('qa'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z
        .object({
        inspectionId: zod_1.z.string(),
        decision: zod_1.z.enum(['approved', 'rejected', 'revision_required']),
        overallComments: zod_1.z.string(),
        itemComments: zod_1.z.record(zod_1.z.string()),
    })
        .parse(req.body);
    const db = (0, database_1.getDB)();
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(body.inspectionId);
    if (!inspection || inspection.status !== 'submitted') {
        res.status(400).json({ error: 'Inspection not available for review' });
        return;
    }
    const assignment = db.prepare('SELECT qa_id FROM assignments WHERE flat_id = ?').get(inspection.flat_id);
    if (assignment.qa_id !== req.user.id) {
        res.status(403).json({ error: 'Not assigned QA for this flat' });
        return;
    }
    const reviewId = (0, uuid_1.v4)();
    db.prepare(`INSERT INTO reviews (id, inspection_id, flat_id, qa_id, decision, overall_comments, item_comments)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(reviewId, body.inspectionId, inspection.flat_id, req.user.id, body.decision, body.overallComments, JSON.stringify(body.itemComments));
    for (const [itemId, comment] of Object.entries(body.itemComments)) {
        db.prepare(`UPDATE responses SET qa_remarks = ? WHERE inspection_id = ? AND item_id = ?`).run(comment, body.inspectionId, itemId);
    }
    let flatStatus = 'approved';
    let inspectionStatus = body.decision;
    if (body.decision === 'approved') {
        const failCount = db.prepare(`SELECT COUNT(*) as c FROM responses WHERE inspection_id = ? AND status = 'fail'`).get(body.inspectionId).c;
        flatStatus = failCount > 0 ? 'desnagging' : 'approved';
        inspectionStatus = 'approved';
    }
    else if (body.decision === 'revision_required') {
        flatStatus = 'revision_required';
        inspectionStatus = 'revision_required';
    }
    else {
        flatStatus = 'rejected';
        inspectionStatus = 'rejected';
    }
    db.prepare(`UPDATE inspections SET status = ? WHERE id = ?`).run(inspectionStatus, body.inspectionId);
    db.prepare(`UPDATE flats SET status = ? WHERE id = ?`).run(flatStatus, inspection.flat_id);
    const notifType = body.decision === 'approved'
        ? 'inspection_approved'
        : body.decision === 'rejected'
            ? 'inspection_rejected'
            : 'revision_required';
    (0, notifications_1.createNotification)(inspection.engineer_id, notifType, `Inspection ${body.decision.replace('_', ' ')}`, body.overallComments, inspection.flat_id);
    res.status(201).json({
        id: reviewId,
        inspectionId: body.inspectionId,
        flatId: inspection.flat_id,
        qaId: req.user.id,
        decision: body.decision,
        overallComments: body.overallComments,
        itemComments: body.itemComments,
        reviewedAt: new Date().toISOString(),
    });
}));
exports.default = router;
//# sourceMappingURL=reviews.js.map