"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
function createNotification(userId, type, title, message, relatedId = '') {
    (0, database_1.getDB)()
        .prepare(`INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?, ?)`)
        .run((0, uuid_1.v4)(), userId, type, title, message, relatedId);
}
//# sourceMappingURL=notifications.js.map