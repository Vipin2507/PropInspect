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
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, requireRole_1.requireRole)('admin'));
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const projectId = req.query.projectId;
    if (!projectId) {
        res.status(400).json({ error: 'projectId required' });
        return;
    }
    const rows = (0, database_1.getDB)().prepare('SELECT * FROM towers WHERE project_id = ?').all(projectId);
    res.json(rows.map(mappers_1.rowToTower));
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z
        .object({
        projectId: zod_1.z.string(),
        name: zod_1.z.string(),
        totalFloors: zod_1.z.number().int().positive(),
        unitsPerFloor: zod_1.z.number().int().positive(),
        unitPrefix: zod_1.z.string(),
        startNumber: zod_1.z.number().int(),
    })
        .parse(req.body);
    const db = (0, database_1.getDB)();
    const towerId = (0, uuid_1.v4)();
    db.prepare(`INSERT INTO towers (id, project_id, name, total_floors, units_per_floor, unit_prefix, start_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(towerId, body.projectId, body.name, body.totalFloors, body.unitsPerFloor, body.unitPrefix, body.startNumber);
    const floors = [];
    const flats = [];
    for (let f = 1; f <= body.totalFloors; f++) {
        const floorId = (0, uuid_1.v4)();
        const label = f === 0 ? 'Ground Floor' : `Floor ${f}`;
        db.prepare(`INSERT INTO floors (id, tower_id, project_id, floor_number, label) VALUES (?, ?, ?, ?, ?)`).run(floorId, towerId, body.projectId, f, label);
        const floorRow = db.prepare('SELECT * FROM floors WHERE id = ?').get(floorId);
        floors.push((0, mappers_1.rowToFloor)(floorRow));
        for (let u = 0; u < body.unitsPerFloor; u++) {
            const flatId = (0, uuid_1.v4)();
            const flatNumber = `${body.unitPrefix}${body.startNumber + (f - 1) * body.unitsPerFloor + u}`;
            db.prepare(`INSERT INTO flats (id, tower_id, project_id, floor_id, flat_number, floor) VALUES (?, ?, ?, ?, ?, ?)`).run(flatId, towerId, body.projectId, floorId, flatNumber, f);
            const flatRow = db.prepare('SELECT * FROM flats WHERE id = ?').get(flatId);
            flats.push((0, mappers_1.rowToFlat)(flatRow));
        }
    }
    const towerRow = db.prepare('SELECT * FROM towers WHERE id = ?').get(towerId);
    res.status(201).json({ tower: (0, mappers_1.rowToTower)(towerRow), floors, flats });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z
        .object({
        name: zod_1.z.string().optional(),
        totalFloors: zod_1.z.number().optional(),
        unitsPerFloor: zod_1.z.number().optional(),
        unitPrefix: zod_1.z.string().optional(),
        startNumber: zod_1.z.number().optional(),
    })
        .parse(req.body);
    const db = (0, database_1.getDB)();
    const row = db.prepare('SELECT * FROM towers WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json({ error: 'Tower not found' });
        return;
    }
    db.prepare(`UPDATE towers SET name = ?, total_floors = ?, units_per_floor = ?, unit_prefix = ?, start_number = ? WHERE id = ?`).run(body.name ?? row.name, body.totalFloors ?? row.total_floors, body.unitsPerFloor ?? row.units_per_floor, body.unitPrefix ?? row.unit_prefix, body.startNumber ?? row.start_number, req.params.id);
    const updated = db.prepare('SELECT * FROM towers WHERE id = ?').get(req.params.id);
    res.json((0, mappers_1.rowToTower)(updated));
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    (0, database_1.getDB)().prepare('DELETE FROM towers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
}));
exports.default = router;
//# sourceMappingURL=towers.js.map