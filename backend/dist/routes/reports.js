"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const errorHandler_1 = require("../middleware/errorHandler");
const stats_1 = require("../utils/stats");
const params_1 = require("../utils/params");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, requireRole_1.requireRole)('admin', 'viewer'));
router.get('/overview', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const db = (0, database_1.getDB)();
    const projects = db.prepare('SELECT id, name FROM projects').all();
    const projectStats = projects.map((p) => (0, stats_1.getProjectStats)(p.id, p.name));
    const snagRows = db.prepare(`SELECT status, severity, COUNT(*) as c FROM snags GROUP BY status, severity`).all();
    const snagSummary = {
        open: 0,
        inRectification: 0,
        rectified: 0,
        closed: 0,
        bySeverity: { critical: 0, major: 0, minor: 0 },
    };
    for (const r of snagRows) {
        if (['open', 'assigned'].includes(r.status))
            snagSummary.open += r.c;
        else if (r.status === 'in_rectification')
            snagSummary.inRectification += r.c;
        else if (r.status === 'rectified')
            snagSummary.rectified += r.c;
        else if (['closed', 'verified'].includes(r.status))
            snagSummary.closed += r.c;
        if (r.severity in snagSummary.bySeverity) {
            snagSummary.bySeverity[r.severity] += r.c;
        }
    }
    const recentSubmissions = db
        .prepare(`SELECT f.flat_number, t.name as tower_name, u.name as engineer_name, i.submitted_at, i.status
         FROM inspections i
         JOIN flats f ON f.id = i.flat_id
         JOIN towers t ON t.id = i.tower_id
         JOIN users u ON u.id = i.engineer_id
         WHERE i.status = 'submitted'
         ORDER BY i.submitted_at DESC LIMIT 10`)
        .all();
    const engineerLeaderboard = db
        .prepare(`SELECT u.id as engineer_id, u.name,
         (SELECT COUNT(*) FROM assignments WHERE engineer_id = u.id) as assigned,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status != 'draft') as submitted,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'approved') as approved,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'rejected') as rejected
         FROM users u WHERE u.role = 'engineer' ORDER BY submitted DESC`)
        .all();
    res.json({
        projectStats,
        snagSummary,
        recentSubmissions: recentSubmissions.map((r) => ({
            flatNumber: r.flat_number,
            towerName: r.tower_name,
            engineerName: r.engineer_name,
            submittedAt: r.submitted_at,
            status: r.status,
        })),
        engineerLeaderboard: engineerLeaderboard.map((e) => ({
            engineerId: e.engineer_id,
            name: e.name,
            assigned: e.assigned,
            submitted: e.submitted,
            approved: e.approved,
            rejected: e.rejected,
        })),
    });
}));
router.get('/projects/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const projectId = (0, params_1.param)(req, 'id');
    const project = (0, database_1.getDB)().prepare('SELECT name FROM projects WHERE id = ?').get(projectId);
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    const stats = (0, stats_1.getProjectStats)(projectId, project.name);
    const towers = (0, database_1.getDB)().prepare('SELECT id, name FROM towers WHERE project_id = ?').all(projectId);
    const towerBreakdown = towers.map((t) => ({
        towerId: t.id,
        towerName: t.name,
        ...(0, stats_1.getProjectStats)(projectId, project.name),
    }));
    res.json({ ...stats, towerBreakdown });
}));
router.get('/engineers', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const rows = (0, database_1.getDB)()
        .prepare(`SELECT u.id as engineer_id, u.name,
         (SELECT COUNT(*) FROM assignments WHERE engineer_id = u.id) as assigned,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status != 'draft') as submitted,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'approved') as approved,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'rejected') as rejected
         FROM users u WHERE u.role = 'engineer' ORDER BY submitted DESC`)
        .all();
    res.json(rows.map((e) => ({
        engineerId: e.engineer_id,
        name: e.name,
        assigned: e.assigned,
        submitted: e.submitted,
        approved: e.approved,
        rejected: e.rejected,
    })));
}));
router.get('/snags', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const db = (0, database_1.getDB)();
    const byStatus = db.prepare(`SELECT status, COUNT(*) as c FROM snags GROUP BY status`).all();
    const bySeverity = db.prepare(`SELECT severity, COUNT(*) as c FROM snags GROUP BY severity`).all();
    res.json({ byStatus, bySeverity });
}));
router.get('/export', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const projectId = req.query.projectId;
    const type = req.query.type || 'flat';
    const db = (0, database_1.getDB)();
    let csv = '';
    if (type === 'flat') {
        csv = 'Flat Number,Tower,Floor,Status\n';
        const rows = db
            .prepare(`SELECT f.flat_number, t.name, fl.label, f.status FROM flats f
           JOIN towers t ON t.id = f.tower_id
           JOIN floors fl ON fl.id = f.floor_id
           WHERE f.project_id = ?`)
            .all(projectId);
        for (const r of rows) {
            csv += `${r.flat_number},${r.name},${r.label},${r.status}\n`;
        }
    }
    else if (type === 'snag') {
        csv = 'Category,Item,Severity,Status,Flat\n';
        const rows = db
            .prepare(`SELECT s.category, s.item_label, s.severity, s.status, f.flat_number FROM snags s
           JOIN flats f ON f.id = s.flat_id WHERE s.project_id = ?`)
            .all(projectId);
        for (const r of rows) {
            csv += `${r.category},${r.item_label},${r.severity},${r.status},${r.flat_number}\n`;
        }
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="export-${type}.csv"`);
    res.send(csv);
}));
exports.default = router;
//# sourceMappingURL=reports.js.map