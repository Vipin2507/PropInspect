"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const mappers_1 = require("../utils/mappers");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const towerId = req.query.towerId;
    if (!towerId) {
        res.status(400).json({ error: 'towerId required' });
        return;
    }
    const db = (0, database_1.getDB)();
    const rows = db.prepare('SELECT * FROM floors WHERE tower_id = ? ORDER BY floor_number').all(towerId);
    const floors = rows.map((row) => {
        const flatCount = db.prepare('SELECT COUNT(*) as c FROM flats WHERE floor_id = ?').get(row.id).c;
        return { ...(0, mappers_1.rowToFloor)(row), flatCount };
    });
    res.json(floors);
}));
exports.default = router;
//# sourceMappingURL=floors.js.map