"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
const otpStore = new Map();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    mobile: zod_1.z.string().optional(),
    password: zod_1.z.string().min(1),
}).refine((d) => d.email || d.mobile, { message: 'Email or mobile required' });
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    mobile: zod_1.z.string().min(10),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['admin', 'engineer', 'qa', 'viewer']),
});
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const db = (0, database_1.getDB)();
    let row;
    if (body.email) {
        row = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(body.email);
    }
    else if (body.mobile) {
        row = db.prepare('SELECT * FROM users WHERE mobile = ? AND is_active = 1').get(body.mobile);
    }
    if (!row || !bcryptjs_1.default.compareSync(body.password, row.password)) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    const user = (0, database_1.rowToUser)(row);
    const token = (0, auth_1.signToken)(user.id);
    res.json({ user, token });
}));
router.post('/register', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const db = (0, database_1.getDB)();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR mobile = ?').get(body.email, body.mobile);
    if (existing) {
        res.status(400).json({ error: 'Email or mobile already registered' });
        return;
    }
    const id = (0, uuid_1.v4)();
    const hash = bcryptjs_1.default.hashSync(body.password, 10);
    db.prepare(`INSERT INTO users (id, name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?, ?)`).run(id, body.name, body.email, body.mobile, hash, body.role);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const user = (0, database_1.rowToUser)(row);
    const token = (0, auth_1.signToken)(id);
    res.status(201).json({ user, token });
}));
router.get('/me', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({ user: req.user });
}));
router.post('/otp/send', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mobile } = zod_1.z.object({ mobile: zod_1.z.string().min(10) }).parse(req.body);
    const user = (0, database_1.getDB)().prepare('SELECT * FROM users WHERE mobile = ? AND is_active = 1').get(mobile);
    if (!user) {
        res.status(404).json({ error: 'Mobile not registered' });
        return;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(mobile, { otp, expires: Date.now() + 5 * 60 * 1000 });
    res.json({ success: true, message: 'OTP sent', otp: process.env.NODE_ENV === 'development' ? otp : undefined });
}));
router.post('/otp/verify', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mobile, otp } = zod_1.z.object({ mobile: zod_1.z.string(), otp: zod_1.z.string().length(6) }).parse(req.body);
    const stored = otpStore.get(mobile);
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
        res.status(401).json({ error: 'Invalid or expired OTP' });
        return;
    }
    otpStore.delete(mobile);
    const row = (0, database_1.getDB)().prepare('SELECT * FROM users WHERE mobile = ?').get(mobile);
    const user = (0, database_1.rowToUser)(row);
    const token = (0, auth_1.signToken)(user.id);
    res.json({ user, token });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map