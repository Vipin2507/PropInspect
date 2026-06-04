"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndSubmitFromSync = validateAndSubmitFromSync;
const database_1 = require("../db/database");
const checklist_1 = require("../constants/checklist");
const uuid_1 = require("uuid");
const checklist_2 = require("../constants/checklist");
const notifications_1 = require("../utils/notifications");
function validateAndSubmitFromSync(inspectionId, isResubmit) {
    const db = (0, database_1.getDB)();
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId);
    if (!inspection)
        throw new Error('Inspection not found');
    const responses = db.prepare('SELECT * FROM responses WHERE inspection_id = ?').all(inspectionId);
    for (const r of responses) {
        if (r.status === 'pending')
            throw new Error('All items must be answered');
        if (r.status === 'fail') {
            const mandatory = (0, checklist_1.getItemMandatoryImage)(r.item_id);
            const imageCount = db.prepare('SELECT COUNT(*) as c FROM images WHERE response_id = ?').get(r.id).c;
            if (mandatory && imageCount === 0)
                throw new Error(`Image required for ${r.item_id}`);
        }
    }
    for (const r of responses) {
        if (r.status === 'fail' && !r.snag_id) {
            const snagId = (0, uuid_1.v4)();
            const cat = checklist_2.DEFAULT_CHECKLIST_CATEGORIES.find((c) => c.id === r.category_id);
            const item = cat?.items.find((i) => i.id === r.item_id);
            db.prepare(`INSERT INTO snags (id, inspection_id, response_id, flat_id, project_id, category, item_label, description, severity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'minor')`).run(snagId, inspectionId, r.id, inspection.flat_id, inspection.project_id, cat?.name || '', item?.label || '', r.remarks || '');
            db.prepare('UPDATE responses SET snag_id = ? WHERE id = ?').run(snagId, r.id);
        }
    }
    db.prepare(`UPDATE inspections SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?`).run(inspectionId);
    db.prepare(`UPDATE flats SET status = 'submitted' WHERE id = ?`).run(inspection.flat_id);
    const assignment = db.prepare('SELECT qa_id FROM assignments WHERE flat_id = ?').get(inspection.flat_id);
    if (assignment) {
        (0, notifications_1.createNotification)(assignment.qa_id, 'inspection_submitted', 'Inspection Submitted', 'Ready for review', inspection.flat_id);
    }
}
//# sourceMappingURL=syncService.js.map