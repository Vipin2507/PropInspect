import { getDB } from '../db/database'

export function getProjectStats(projectId: string, projectName: string) {
  const db = getDB()
  const counts = db
    .prepare(
      `SELECT status, COUNT(*) as c FROM flats WHERE project_id = ? GROUP BY status`
    )
    .all(projectId) as { status: string; c: number }[]

  const map: Record<string, number> = {}
  for (const row of counts) map[row.status] = row.c

  const totalFlats = Object.values(map).reduce((a, b) => a + b, 0)
  const approved = map.approved || 0
  const openSnags = (
    db.prepare(`SELECT COUNT(*) as c FROM snags WHERE project_id = ? AND status NOT IN ('closed','verified')`).get(projectId) as { c: number }
  ).c
  const closedSnags = (
    db.prepare(`SELECT COUNT(*) as c FROM snags WHERE project_id = ? AND status IN ('closed','verified')`).get(projectId) as { c: number }
  ).c

  return {
    projectId,
    projectName,
    totalFlats,
    notStarted: map.not_started || 0,
    inProgress: map.in_progress || 0,
    submitted: map.submitted || 0,
    approved: map.approved || 0,
    rejected: map.rejected || 0,
    revisionRequired: map.revision_required || 0,
    desnagging: map.desnagging || 0,
    handedOver: map.handed_over || 0,
    openSnags,
    closedSnags,
    completionPct: totalFlats ? Math.round(((approved + (map.handed_over || 0)) / totalFlats) * 100) : 0,
  }
}
