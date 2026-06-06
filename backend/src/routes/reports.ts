import { Router } from 'express'
import { getDB, utcTs } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { getProjectStats } from '../utils/stats'
import { param } from '../utils/params'

const router = Router()
router.use(authenticate)

router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const db = getDB()
    const projects = db.prepare('SELECT id, name FROM projects').all() as { id: string; name: string }[]
    const projectStats = projects.map((p) => getProjectStats(p.id, p.name))

    const snagRows = db.prepare(`SELECT status, severity, COUNT(*) as c FROM snags GROUP BY status, severity`).all() as {
      status: string
      severity: string
      c: number
    }[]

    const snagSummary = {
      open: 0,
      inRectification: 0,
      rectified: 0,
      closed: 0,
      bySeverity: { critical: 0, major: 0, minor: 0 },
    }
    for (const r of snagRows) {
      if (['open', 'assigned'].includes(r.status)) snagSummary.open += r.c
      else if (r.status === 'in_rectification') snagSummary.inRectification += r.c
      else if (r.status === 'rectified') snagSummary.rectified += r.c
      else if (['closed', 'verified'].includes(r.status)) snagSummary.closed += r.c
      if (r.severity in snagSummary.bySeverity) {
        snagSummary.bySeverity[r.severity as keyof typeof snagSummary.bySeverity] += r.c
      }
    }

    const recentSubmissions = db
      .prepare(
        `SELECT f.flat_number, t.name as tower_name, u.name as engineer_name, i.submitted_at, i.status
         FROM inspections i
         JOIN flats f ON f.id = i.flat_id
         JOIN towers t ON t.id = i.tower_id
         JOIN users u ON u.id = i.engineer_id
         WHERE i.status = 'submitted'
         ORDER BY i.submitted_at DESC LIMIT 10`
      )
      .all() as Record<string, unknown>[]

    const engineerLeaderboard = db
      .prepare(
        `SELECT u.id as engineer_id, u.name,
         (SELECT COUNT(*) FROM assignments WHERE engineer_id = u.id) as assigned,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status != 'draft') as submitted,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'approved') as approved,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'rejected') as rejected
         FROM users u WHERE u.role = 'engineer' ORDER BY submitted DESC`
      )
      .all() as Record<string, unknown>[]

    res.json({
      projectStats,
      snagSummary,
      recentSubmissions: recentSubmissions.map((r) => ({
        flatNumber: r.flat_number,
        towerName: r.tower_name,
        engineerName: r.engineer_name,
        submittedAt: utcTs(r.submitted_at),
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
    })
  })
)

router.get(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const projectId = param(req, 'id')
    const project = getDB().prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as { name: string }
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    const stats = getProjectStats(projectId, project.name)
    const towers = getDB().prepare('SELECT id, name FROM towers WHERE project_id = ?').all(projectId) as { id: string; name: string }[]
    const towerBreakdown = towers.map((t) => ({
      towerId: t.id,
      towerName: t.name,
      ...getProjectStats(projectId, project.name),
    }))
    res.json({ ...stats, towerBreakdown })
  })
)

router.get(
  '/engineers',
  asyncHandler(async (_req, res) => {
    const rows = getDB()
      .prepare(
        `SELECT u.id as engineer_id, u.name,
         (SELECT COUNT(*) FROM assignments WHERE engineer_id = u.id) as assigned,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status != 'draft') as submitted,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'approved') as approved,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'rejected') as rejected
         FROM users u WHERE u.role = 'engineer' ORDER BY submitted DESC`
      )
      .all() as Record<string, unknown>[]
    res.json(
      rows.map((e) => ({
        engineerId: e.engineer_id,
        name: e.name,
        assigned: e.assigned,
        submitted: e.submitted,
        approved: e.approved,
        rejected: e.rejected,
      }))
    )
  })
)

router.get(
  '/snags',
  asyncHandler(async (_req, res) => {
    const db = getDB()
    const byStatus = db.prepare(`SELECT status, COUNT(*) as c FROM snags GROUP BY status`).all() as { status: string; c: number }[]
    const bySeverity = db.prepare(`SELECT severity, COUNT(*) as c FROM snags GROUP BY severity`).all() as { severity: string; c: number }[]
    res.json({ byStatus, bySeverity })
  })
)

router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const projectId = req.query.projectId as string
    const type = (req.query.type as string) || 'flat'
    const db = getDB()

    let csv = ''
    if (type === 'flat') {
      csv = 'Flat Number,Tower,Floor,Status\n'
      const rows = db
        .prepare(
          `SELECT f.flat_number, t.name, fl.label, f.status FROM flats f
           JOIN towers t ON t.id = f.tower_id
           JOIN floors fl ON fl.id = f.floor_id
           WHERE f.project_id = ?`
        )
        .all(projectId) as Record<string, unknown>[]
      for (const r of rows) {
        csv += `${r.flat_number},${r.name},${r.label},${r.status}\n`
      }
    } else if (type === 'snag') {
      csv = 'Category,Item,Severity,Status,Flat\n'
      const rows = db
        .prepare(
          `SELECT s.category, s.item_label, s.severity, s.status, f.flat_number FROM snags s
           JOIN flats f ON f.id = s.flat_id WHERE s.project_id = ?`
        )
        .all(projectId) as Record<string, unknown>[]
      for (const r of rows) {
        csv += `${r.category},${r.item_label},${r.severity},${r.status},${r.flat_number}\n`
      }
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="export-${type}.csv"`)
    res.send(csv)
  })
)

export default router
