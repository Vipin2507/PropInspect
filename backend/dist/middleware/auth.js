"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.signToken = signToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../db/database");
function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const token = header.slice(7);
    try {
        const secret = process.env.JWT_SECRET || 'dev_secret_minimum_32_characters_long';
        const payload = jsonwebtoken_1.default.verify(token, secret);
        const row = (0, database_1.getDB)().prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.userId);
        if (!row) {
            res.status(401).json({ error: 'User not found or inactive' });
            return;
        }
        req.user = (0, database_1.rowToUser)(row);
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
function signToken(userId) {
    const secret = process.env.JWT_SECRET || 'dev_secret_minimum_32_characters_long';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jsonwebtoken_1.default.sign({ userId }, secret, { expiresIn });
}
//# sourceMappingURL=auth.js.map