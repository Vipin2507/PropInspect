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

dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT || '4000', 10)
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads')
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
const allowedOrigins = [CORS_ORIGIN, 'http://localhost', 'capacitor://localhost']

getDB()
seedDatabase()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
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

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`SnagDesk API running on http://localhost:${PORT}`)
})
