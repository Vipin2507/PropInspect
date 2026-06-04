"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const mappers_1 = require("../utils/mappers");
const syncService_1 = require("../services/syncService");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/push', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { changes } = zod_1.z.object({ changes: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())) }).parse(req.body);
    let processed = 0;
    let failed = 0;
    const errors = [];
    for (const change of changes) {
        try {
            const type = change.type;
            const payload = change.payload;
            const db = (0, database_1.getDB)();
            if (type === 'save_inspection') {
                const inspectionId = payload.inspectionId;
                const responses = payload.responses;
                for (const r of responses) {
                    db.prepare(`UPDATE responses SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`).run(r.status ?? 'pending', r.remarks ?? '', r.id);
                }
                db.prepare(`UPDATE inspections SET last_updated = datetime('now') WHERE id = ?`).run(inspectionId);
                processed++;
            }
            else if (type === 'submit_inspection' || type === 'resubmit_inspection') {
                (0, syncService_1.validateAndSubmitFromSync)(payload.inspectionId, type === 'resubmit_inspection');
                processed++;
            }
            else if (type === 'review_decision') {
                processed++;
            }
            else if (type === 'update_snag') {
                const { snagId, changes: snagChanges } = payload;
                const snag = db.prepare('SELECT * FROM snags WHERE id = ?').get(snagId);
                if (snag) {
                    db.prepare(`UPDATE snags SET status = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`).run(snagChanges.status ?? snag.status, snagChanges.remarks ?? snag.remarks, snagId);
                }
                processed++;
            }
            else {
                processed++;
            }
        }
        catch (e) {
            failed++;
            errors.push(e instanceof Error ? e.message : 'Unknown error');
        }
    }
    res.json({ processed, failed, errors });
}));
router.get('/pull', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const since = req.query.since || '1970-01-01';
    const db = (0, database_1.getDB)();
    const user = req.user;
    let flats = [];
    let inspections = [];
    let responses = [];
    let snags = [];
    let notifications = [];
    if (user.role === 'engineer') {
        flats = db.prepare(`SELECT f.* FROM flats f
           JOIN assignments a ON a.flat_id = f.id
           WHERE a.engineer_id = ? AND f.created_at > ?`).all(user.id, since).map(mappers_1.rowToFlat);
        inspections = db
            .prepare(`SELECT * FROM inspections WHERE engineer_id = ? AND last_updated > ?`)
            .all(user.id, since);
        const inspIds = inspections.map((i) => i.id);
        if (inspIds.length) {
            const placeholders = inspIds.map(() => '?').join(',');
            responses = db.prepare(`SELECT * FROM responses WHERE inspection_id IN (${placeholders})`).all(...inspIds);
            snags = db.prepare(`SELECT * FROM snags WHERE inspection_id IN (${placeholders})`).all(...inspIds);
        }
    }
    notifications = db
        .prepare(`SELECT * FROM notifications WHERE user_id = ? AND created_at > ?`)
        .all(user.id, since);
    res.json({ flats, inspections, responses, snags, notifications });
}));
exports.default = router;
//# sourceMappingURL=sync.js.map