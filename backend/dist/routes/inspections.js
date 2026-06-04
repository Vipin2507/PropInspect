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
const checklist_1 = require("../constants/checklist");
const checklist_2 = require("../constants/checklist");
const notifications_1 = require("../utils/notifications");
const params_1 = require("../utils/params");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
function getImagesForResponse(responseId) {
    const rows = (0, database_1.getDB)()
        .prepare('SELECT * FROM images WHERE response_id = ?')
        .all(responseId);
    return rows.map(mappers_1.rowToImage);
}
function loadInspection(inspectionId) {
    const db = (0, database_1.getDB)();
    const row = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId);
    if (!row)
        return null;
    const responses = db.prepare('SELECT * FROM responses WHERE inspection_id = ?').all(inspectionId).map((r) => (0, mappers_1.rowToResponse)(r, getImagesForResponse(r.id)));
    const insp = (0, mappers_1.rowToInspection)(row);
    const passCount = responses.filter((r) => r.status === 'pass').length;
    const failCount = responses.filter((r) => r.status === 'fail').length;
    const naCount = responses.filter((r) => r.status === 'na').length;
    return {
        ...insp,
        responses,
        totalItems: responses.length,
        passCount,
        failCount,
        naCount,
    };
}
function createDraftInspection(flatId, engineerId) {
    const db = (0, database_1.getDB)();
    const flat = db.prepare('SELECT * FROM flats WHERE id = ?').get(flatId);
    if (!flat)
        throw new errorHandler_1.AppError('Flat not found', 404);
    const template = db.prepare('SELECT id FROM checklist_templates WHERE is_default = 1 LIMIT 1').get();
    if (!template)
        throw new errorHandler_1.AppError('No default checklist template', 500);
    const inspectionId = (0, uuid_1.v4)();
    db.prepare(`INSERT INTO inspections (id, flat_id, project_id, tower_id, floor_id, engineer_id, template_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`).run(inspectionId, flatId, flat.project_id, flat.tower_id, flat.floor_id, engineerId, template.id);
    const insertResponse = db.prepare(`INSERT INTO responses (id, inspection_id, item_id, category_id, status) VALUES (?, ?, ?, ?, 'pending')`);
    for (const cat of checklist_1.DEFAULT_CHECKLIST_CATEGORIES) {
        for (const item of cat.items) {
            const responseId = `${inspectionId}_${item.id}`;
            insertResponse.run(responseId, inspectionId, item.id, cat.id);
        }
    }
    return loadInspection(inspectionId);
}
router.get('/flat/:flatId', (0, requireRole_1.requireRole)('engineer', 'qa', 'admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDB)();
    const flatId = (0, params_1.param)(req, 'flatId');
    let row = db.prepare('SELECT * FROM inspections WHERE flat_id = ?').get(flatId);
    if (!row) {
        if (req.user.role !== 'engineer') {
            res.status(404).json({ error: 'No inspection for this flat' });
            return;
        }
        const assignment = db.prepare('SELECT engineer_id FROM assignments WHERE flat_id = ?').get(flatId);
        if (!assignment || assignment.engineer_id !== req.user.id) {
            res.status(403).json({ error: 'Not assigned to this flat' });
            return;
        }
        const inspection = createDraftInspection(flatId, req.user.id);
        res.json(inspection);
        return;
    }
    if (req.user.role === 'engineer' && row.engineer_id !== req.user.id) {
        res.status(403).json({ error: 'Not your inspection' });
        return;
    }
    res.json(loadInspection(row.id));
}));
router.put('/:id', (0, requireRole_1.requireRole)('engineer'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z.object({ responses: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())) }).parse(req.body);
    const db = (0, database_1.getDB)();
    const inspectionId = (0, params_1.param)(req, 'id');
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId);
    if (!inspection || inspection.engineer_id !== req.user.id) {
        res.status(403).json({ error: 'Not authorized' });
        return;
    }
    if (!['draft', 'revision_required'].includes(inspection.status)) {
        res.status(400).json({ error: 'Cannot edit inspection in current status' });
        return;
    }
    const update = db.prepare(`UPDATE responses SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ? AND inspection_id = ?`);
    for (const r of body.responses) {
        if (r.id && r.status) {
            update.run(r.status, r.remarks ?? '', r.id, inspectionId);
        }
    }
    db.prepare(`UPDATE inspections SET last_updated = datetime('now') WHERE id = ?`).run(inspectionId);
    db.prepare(`UPDATE flats SET status = 'in_progress' WHERE id = ? AND status = 'not_started'`).run(inspection.flat_id);
    res.json(loadInspection(inspectionId));
}));
function validateAndSubmit(inspectionId, isResubmit) {
    const db = (0, database_1.getDB)();
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId);
    if (!inspection)
        throw new errorHandler_1.AppError('Inspection not found', 404);
    if (isResubmit && inspection.status !== 'revision_required') {
        throw new errorHandler_1.AppError('Can only resubmit after revision required', 400);
    }
    if (!isResubmit && !['draft', 'revision_required'].includes(inspection.status)) {
        throw new errorHandler_1.AppError('Inspection already submitted', 400);
    }
    const responses = db.prepare('SELECT * FROM responses WHERE inspection_id = ?').all(inspectionId);
    for (const r of responses) {
        if (r.status === 'pending') {
            throw new errorHandler_1.AppError('All checklist items must be answered before submit', 400);
        }
        if (r.status === 'fail') {
            const mandatory = (0, checklist_2.getItemMandatoryImage)(r.item_id);
            const imageCount = db.prepare('SELECT COUNT(*) as c FROM images WHERE response_id = ?').get(r.id).c;
            if (mandatory && imageCount === 0) {
                throw new errorHandler_1.AppError(`Fail item "${r.item_id}" requires at least one image`, 400);
            }
        }
    }
    const snags = [];
    for (const r of responses) {
        if (r.status === 'fail') {
            let snagId = r.snag_id;
            if (!snagId) {
                snagId = (0, uuid_1.v4)();
                const cat = checklist_1.DEFAULT_CHECKLIST_CATEGORIES.find((c) => c.id === r.category_id);
                const item = cat?.items.find((i) => i.id === r.item_id);
                db.prepare(`INSERT INTO snags (id, inspection_id, response_id, flat_id, project_id, category, item_label, description, severity)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'minor')`).run(snagId, inspectionId, r.id, inspection.flat_id, inspection.project_id, cat?.name || r.category_id, item?.label || r.item_id, r.remarks || '');
                db.prepare('UPDATE responses SET snag_id = ? WHERE id = ?').run(snagId, r.id);
            }
            const snagRow = db.prepare('SELECT * FROM snags WHERE id = ?').get(snagId);
            const beforeImages = db.prepare('SELECT * FROM images WHERE response_id = ?').all(r.id);
            snags.push((0, mappers_1.rowToSnag)(snagRow, beforeImages.map(mappers_1.rowToImage), []));
        }
    }
    db.prepare(`UPDATE inspections SET status = 'submitted', submitted_at = datetime('now'), last_updated = datetime('now') WHERE id = ?`).run(inspectionId);
    db.prepare(`UPDATE flats SET status = 'submitted' WHERE id = ?`).run(inspection.flat_id);
    const assignment = db.prepare('SELECT qa_id FROM assignments WHERE flat_id = ?').get(inspection.flat_id);
    if (assignment) {
        (0, notifications_1.createNotification)(assignment.qa_id, 'inspection_submitted', 'Inspection Submitted', 'A flat inspection is ready for your review', inspection.flat_id);
    }
    return { inspection: loadInspection(inspectionId), snags };
}
router.post('/:id/submit', (0, requireRole_1.requireRole)('engineer'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const inspectionId = (0, params_1.param)(req, 'id');
    const inspection = (0, database_1.getDB)().prepare('SELECT engineer_id FROM inspections WHERE id = ?').get(inspectionId);
    if (!inspection || inspection.engineer_id !== req.user.id) {
        res.status(403).json({ error: 'Not authorized' });
        return;
    }
    const result = validateAndSubmit(inspectionId, false);
    res.json(result);
}));
router.post('/:id/resubmit', (0, requireRole_1.requireRole)('engineer'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const inspectionId = (0, params_1.param)(req, 'id');
    const inspection = (0, database_1.getDB)().prepare('SELECT engineer_id FROM inspections WHERE id = ?').get(inspectionId);
    if (!inspection || inspection.engineer_id !== req.user.id) {
        res.status(403).json({ error: 'Not authorized' });
        return;
    }
    const result = validateAndSubmit(inspectionId, true);
    res.json(result);
}));
exports.default = router;
//# sourceMappingURL=inspections.js.map