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
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status != 'draft') as submitted,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'approved') as approved,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'rejected') as rejected,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'revision_required') as revisionRequired
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
        submitted: e.submitted,
        approved: e.approved,
        rejected: e.rejected,
        revisionRequired: e.revisionRequired,
      })),
    })
  })
)

// ── Filtered flat-level dashboard query ─────────────────────────────────────
// Supports: projectId, engineerId, status, dateFrom, dateTo
router.get(
  '/flats',
  asyncHandler(async (req, res) => {
    const db = getDB()
    const { projectId, engineerId, status, dateFrom, dateTo } = req.query as Record<string, string>

    const conditions: string[] = []
    const params: unknown[] = []

    if (projectId) { conditions.push('f.project_id = ?'); params.push(projectId) }
    if (engineerId) { conditions.push('a.engineer_id = ?'); params.push(engineerId) }
    if (status) { conditions.push('f.status = ?'); params.push(status) }
    if (dateFrom) { conditions.push("date(i.last_updated) >= date(?)"); params.push(dateFrom) }
    if (dateTo)   { conditions.push("date(i.last_updated) <= date(?)"); params.push(dateTo) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = db.prepare(`
      SELECT
        f.id as flat_id,
        f.flat_number,
        f.status as flat_status,
        t.name as tower_name,
        p.name as project_name,
        p.id as project_id,
        u.name as engineer_name,
        u.id as engineer_id,
        i.status as inspection_status,
        i.submitted_at,
        i.last_updated,
        (SELECT COUNT(*) FROM responses r WHERE r.inspection_id = i.id AND r.status = 'pass') as pass_count,
        (SELECT COUNT(*) FROM responses r WHERE r.inspection_id = i.id AND r.status = 'fail') as fail_count,
        (SELECT COUNT(*) FROM responses r WHERE r.inspection_id = i.id AND r.status = 'pending') as pending_count,
        (SELECT COUNT(*) FROM snags s WHERE s.flat_id = f.id AND s.status NOT IN ('closed','verified')) as open_snags
      FROM flats f
      JOIN projects p ON p.id = f.project_id
      JOIN towers t ON t.id = f.tower_id
      LEFT JOIN assignments a ON a.flat_id = f.id
      LEFT JOIN users u ON u.id = a.engineer_id
      LEFT JOIN inspections i ON i.flat_id = f.id
      ${where}
      ORDER BY p.name, t.name, f.flat_number
    `).all(...params) as Record<string, unknown>[]

    // Summary counts for the filtered set
    const summary = {
      total: rows.length,
      notStarted: rows.filter((r) => r.flat_status === 'not_started').length,
      inProgress: rows.filter((r) => r.flat_status === 'in_progress').length,
      submitted: rows.filter((r) => r.flat_status === 'submitted').length,
      approved: rows.filter((r) => r.flat_status === 'approved').length,
      rejected: rows.filter((r) => r.flat_status === 'rejected').length,
      revisionRequired: rows.filter((r) => r.flat_status === 'revision_required').length,
      desnagging: rows.filter((r) => r.flat_status === 'desnagging').length,
      openSnags: rows.reduce((acc, r) => acc + (Number(r.open_snags) || 0), 0),
    }

    res.json({
      summary,
      flats: rows.map((r) => ({
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        flatStatus: r.flat_status,
        towerName: r.tower_name,
        projectName: r.project_name,
        projectId: r.project_id,
        engineerName: r.engineer_name,
        engineerId: r.engineer_id,
        inspectionStatus: r.inspection_status,
        submittedAt: utcTs(r.submitted_at),
        lastUpdated: utcTs(r.last_updated),
        passCount: Number(r.pass_count) || 0,
        failCount: Number(r.fail_count) || 0,
        pendingCount: Number(r.pending_count) || 0,
        openSnags: Number(r.open_snags) || 0,
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
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status != 'draft') as submitted,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'approved') as approved,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'rejected') as rejected,
         (SELECT COUNT(*) FROM inspections WHERE engineer_id = u.id AND status = 'revision_required') as revisionRequired
         FROM users u WHERE u.role = 'engineer' ORDER BY submitted DESC`
      )
      .all() as Record<string, unknown>[]
    res.json(
      rows.map((e) => ({
        engineerId: e.engineer_id,
        name: e.name,
        submitted: e.submitted,
        approved: e.approved,
        rejected: e.rejected,
        revisionRequired: e.revisionRequired,
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

router.get(
  '/activity',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const db = getDB()
    const limit = Math.min(parseInt(req.query.limit as string || '100'), 200)

    // Recent inspection changes by engineers
    const engineerActivity = db.prepare(`
      SELECT
        'inspection_update' as activity_type,
        u.id as user_id,
        u.name as user_name,
        u.role as user_role,
        i.id as inspection_id,
        i.status as inspection_status,
        f.flat_number,
        t.name as tower_name,
        p.name as project_name,
        i.last_updated as activity_at
      FROM inspections i
      JOIN users u ON u.id = i.engineer_id
      JOIN flats f ON f.id = i.flat_id
      JOIN towers t ON t.id = i.tower_id
      JOIN projects p ON p.id = i.project_id
      ORDER BY i.last_updated DESC LIMIT ?
    `).all(limit) as Record<string, unknown>[]

    // Recent reviews by checkers/QA
    const checkerActivity = db.prepare(`
      SELECT
        'review' as activity_type,
        u.id as user_id,
        u.name as user_name,
        u.role as user_role,
        r.inspection_id,
        r.decision as inspection_status,
        f.flat_number,
        t.name as tower_name,
        p.name as project_name,
        r.reviewed_at as activity_at,
        r.overall_comments
      FROM reviews r
      JOIN users u ON u.id = r.qa_id
      JOIN flats f ON f.id = r.flat_id
      JOIN towers t ON t.id = f.tower_id
      JOIN projects p ON p.id = f.project_id
      ORDER BY r.reviewed_at DESC LIMIT ?
    `).all(limit) as Record<string, unknown>[]

    // Merge and sort by date
    const combined = [...engineerActivity, ...checkerActivity]
      .sort((a, b) => {
        const dateA = new Date(utcTs(a.activity_at) || 0).getTime()
        const dateB = new Date(utcTs(b.activity_at) || 0).getTime()
        return dateB - dateA
      })
      .slice(0, limit)
      .map((r) => ({
        activityType: r.activity_type,
        userId: r.user_id,
        userName: r.user_name,
        userRole: r.user_role,
        inspectionId: r.inspection_id,
        inspectionStatus: r.inspection_status,
        flatNumber: r.flat_number,
        towerName: r.tower_name,
        projectName: r.project_name,
        activityAt: utcTs(r.activity_at),
        comments: r.overall_comments || undefined,
      }))

    res.json(combined)
  })
)

export default router
