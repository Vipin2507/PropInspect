import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { rowToImage } from '../utils/mappers'

const router = Router()
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads')
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB — files >= this are rejected
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

router.use(authenticate)

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }
    // Req 7.2 — strict < 10 MB (multer limit catches oversized but we double-check)
    if (req.file.size >= 10 * 1024 * 1024) {
      res.status(400).json({ error: 'File must be less than 10 MB' })
      return
    }
    const { inspectionId, responseId, snagId, itemId, caption = '' } = req.body
    // Req 7.4 — QA uploads are always type='evidence'
    const type = req.user!.role === 'qa' ? 'evidence' : (req.body.type || 'evidence')
    if (!inspectionId) {
      res.status(400).json({ error: 'inspectionId required' })
      return
    }

    const dir = path.join(UPLOADS_DIR, inspectionId)
    const thumbDir = path.join(dir, 'thumbs')
    fs.mkdirSync(thumbDir, { recursive: true })

    const fileId = uuidv4()
    const filename = `${fileId}.jpg`
    const filepath = path.join(dir, filename)
    const thumbpath = path.join(thumbDir, filename)

    const image = sharp(req.file.buffer).rotate()
    const metadata = await image.metadata()
    const maxDim = 1920
    let pipeline = image
    if ((metadata.width || 0) > maxDim || (metadata.height || 0) > maxDim) {
      pipeline = pipeline.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    }
    await pipeline.jpeg({ quality: 80 }).toFile(filepath)
    await sharp(filepath).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbpath)

    const url = `/uploads/${inspectionId}/${filename}`
    const thumbnailUrl = `/uploads/${inspectionId}/thumbs/${filename}`
    const id = uuidv4()

    getDB()
      .prepare(
        `INSERT INTO images (id, inspection_id, response_id, snag_id, item_id, type, url, thumbnail_url, caption)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, inspectionId, responseId || null, snagId || null, itemId || null, type, url, thumbnailUrl, caption)

    res.status(201).json({ id, url, thumbnailUrl })
  })
)

router.delete(
  '/:id',
  requireRole('engineer'),
  asyncHandler(async (req, res) => {
    const db = getDB()
    const image = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (!image) {
      res.status(404).json({ error: 'Image not found' })
      return
    }
    const inspection = db.prepare('SELECT engineer_id, status FROM inspections WHERE id = ?').get(image.inspection_id) as { engineer_id: string; status: string }
    if (!inspection || inspection.engineer_id !== req.user!.id || !['draft', 'revision_required'].includes(inspection.status)) {
      res.status(403).json({ error: 'Cannot delete image' })
      return
    }
    const filepath = path.join(UPLOADS_DIR, (image.url as string).replace('/uploads/', ''))
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  })
)

export default router
