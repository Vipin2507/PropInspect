import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'path'
import dotenv from 'dotenv'

import { getDB } from './db/database'
import { seedDatabase } from './db/seed'
import { errorHandler } from './middleware/errorHandler'
import { DEFAULT_CHECKLIST_CATEGORIES } from './constants/checklist'

import authRoutes from './routes/auth'
import projectRoutes from './routes/projects'
import towerRoutes from './routes/towers'
import floorRoutes from './routes/floors'
import flatRoutes from './routes/flats'
import assignmentRoutes from './routes/assignments'
import checklistRoutes from './routes/checklists'
import inspectionRoutes from './routes/inspections'
import responseRoutes from './routes/responses'
import snagRoutes from './routes/snags'
import reviewRoutes from './routes/reviews'
import imageRoutes from './routes/images'
import userRoutes from './routes/users'
import notificationRoutes from './routes/notifications'
import reportRoutes from './routes/reports'
import syncRoutes from './routes/sync'
import bulkUploadRoutes from './routes/bulkUpload'

dotenv.config()

const app = express()
app.set('trust proxy', 1);
const PORT = parseInt(process.env.PORT || '4000', 10)
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads')
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
const allowedOrigins = [
  CORS_ORIGIN,
  'http://localhost',
  'https://localhost',       // Capacitor Android (androidScheme: https)
  'capacitor://localhost', // Capacitor iOS
  'ionic://localhost',
]

getDB()
seedDatabase()

// Always sync the default checklist template with the current constant
// so existing DBs get updated when categories change
;(function updateDefaultTemplate() {
  const db = getDB()
  const row = db.prepare('SELECT id FROM checklist_templates WHERE is_default = 1 LIMIT 1').get() as { id: string } | undefined
  if (!row) return
  const sections = DEFAULT_CHECKLIST_CATEGORIES.map((cat) => ({
    id: cat.id,
    templateId: row.id,
    name: cat.name,
    icon: cat.icon,
    sortOrder: cat.sortOrder,
    items: cat.items,
  }))
  db.prepare(
    `UPDATE checklist_templates SET name = 'Default Snagging Checklist', sections = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(JSON.stringify(sections), row.id)
  console.log(`[startup] Default checklist template updated — ${DEFAULT_CHECKLIST_CATEGORIES.length} categories, ${DEFAULT_CHECKLIST_CATEGORIES.reduce((a, c) => a + c.items.length, 0)} items`)
})()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: (origin, callback) => {
    const isWildcard = process.env.CORS_ORIGIN === '*';
    
    if (!origin || isWildcard || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}))

app.use(morgan('dev'))
app.use(express.json({ limit: '50mb' })) 
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Rate limit — skip for trusted internal traffic (Nginx proxy)
// Trust proxy is set above so req.ip is the real client IP, not 127.0.0.1
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000,                 // 2000 requests per window per real IP
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for requests coming from localhost / same machine
    skip: (req) => {
      const ip = req.ip || ''
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
    },
  })
)

app.use('/uploads', express.static(UPLOADS_DIR))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'SnagDesk API' })
})

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/towers', towerRoutes)
app.use('/api/floors', floorRoutes)
app.use('/api/flats', flatRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/templates', checklistRoutes)
app.use('/api/inspections', inspectionRoutes)
app.use('/api/responses', responseRoutes)
app.use('/api/snags', snagRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/images', imageRoutes)
app.use('/api/users', userRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/bulk-upload', bulkUploadRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`SnagDesk API running on http://localhost:${PORT}`)
})
