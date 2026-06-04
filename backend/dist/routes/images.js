"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
const UPLOADS_DIR = process.env.UPLOADS_DIR || path_1.default.join(__dirname, '../../uploads');
const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024);
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type'));
        }
    },
});
router.use(auth_1.authenticate);
router.post('/upload', upload.single('file'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const { inspectionId, responseId, snagId, itemId, type = 'evidence', caption = '' } = req.body;
    if (!inspectionId) {
        res.status(400).json({ error: 'inspectionId required' });
        return;
    }
    const dir = path_1.default.join(UPLOADS_DIR, inspectionId);
    const thumbDir = path_1.default.join(dir, 'thumbs');
    fs_1.default.mkdirSync(thumbDir, { recursive: true });
    const fileId = (0, uuid_1.v4)();
    const filename = `${fileId}.jpg`;
    const filepath = path_1.default.join(dir, filename);
    const thumbpath = path_1.default.join(thumbDir, filename);
    const image = (0, sharp_1.default)(req.file.buffer).rotate();
    const metadata = await image.metadata();
    const maxDim = 1920;
    let pipeline = image;
    if ((metadata.width || 0) > maxDim || (metadata.height || 0) > maxDim) {
        pipeline = pipeline.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
    }
    await pipeline.jpeg({ quality: 80 }).toFile(filepath);
    await (0, sharp_1.default)(filepath).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbpath);
    const url = `/uploads/${inspectionId}/${filename}`;
    const thumbnailUrl = `/uploads/${inspectionId}/thumbs/${filename}`;
    const id = (0, uuid_1.v4)();
    (0, database_1.getDB)()
        .prepare(`INSERT INTO images (id, inspection_id, response_id, snag_id, item_id, type, url, thumbnail_url, caption)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, inspectionId, responseId || null, snagId || null, itemId || null, type, url, thumbnailUrl, caption);
    res.status(201).json({ id, url, thumbnailUrl });
}));
router.delete('/:id', (0, requireRole_1.requireRole)('engineer'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDB)();
    const image = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id);
    if (!image) {
        res.status(404).json({ error: 'Image not found' });
        return;
    }
    const inspection = db.prepare('SELECT engineer_id, status FROM inspections WHERE id = ?').get(image.inspection_id);
    if (!inspection || inspection.engineer_id !== req.user.id || inspection.status !== 'draft') {
        res.status(403).json({ error: 'Cannot delete image' });
        return;
    }
    const filepath = path_1.default.join(UPLOADS_DIR, image.url.replace('/uploads/', ''));
    if (fs_1.default.existsSync(filepath))
        fs_1.default.unlinkSync(filepath);
    db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id);
    res.json({ success: true });
}));
exports.default = router;
//# sourceMappingURL=images.js.map