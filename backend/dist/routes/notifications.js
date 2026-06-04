"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const rows = (0, database_1.getDB)()
        .prepare(`SELECT * FROM notifications WHERE user_id = ?
         ORDER BY is_read ASC, created_at DESC LIMIT 50`)
        .all(req.user.id);
    res.json(rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        title: r.title,
        message: r.message,
        relatedId: r.related_id,
        isRead: Boolean(r.is_read),
        createdAt: r.created_at,
    })));
}));
router.get('/count', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const row = (0, database_1.getDB)()
        .prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0')
        .get(req.user.id);
    res.json({ unread: row.c });
}));
router.patch('/:id/read', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    (0, database_1.getDB)().prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
}));
router.patch('/read-all', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    (0, database_1.getDB)().prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true });
}));
exports.default = router;
//# sourceMappingURL=notifications.js.map