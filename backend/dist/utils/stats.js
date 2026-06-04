"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectStats = getProjectStats;
const database_1 = require("../db/database");
function getProjectStats(projectId, projectName) {
    const db = (0, database_1.getDB)();
    const counts = db
        .prepare(`SELECT status, COUNT(*) as c FROM flats WHERE project_id = ? GROUP BY status`)
        .all(projectId);
    const map = {};
    for (const row of counts)
        map[row.status] = row.c;
    const totalFlats = Object.values(map).reduce((a, b) => a + b, 0);
    const approved = map.approved || 0;
    const openSnags = db.prepare(`SELECT COUNT(*) as c FROM snags WHERE project_id = ? AND status NOT IN ('closed','verified')`).get(projectId).c;
    const closedSnags = db.prepare(`SELECT COUNT(*) as c FROM snags WHERE project_id = ? AND status IN ('closed','verified')`).get(projectId).c;
    return {
        projectId,
        projectName,
        totalFlats,
        notStarted: map.not_started || 0,
        inProgress: map.in_progress || 0,
        submitted: map.submitted || 0,
        approved: approved,
        rejected: map.rejected || 0,
        revisionRequired: map.revision_required || 0,
        desnagging: map.desnagging || 0,
        openSnags,
        closedSnags,
        completionPct: totalFlats ? Math.round((approved / totalFlats) * 100) : 0,
    };
}
//# sourceMappingURL=stats.js.map