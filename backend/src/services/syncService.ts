import { getDB } from '../db/database'
import { getItemMandatoryImage } from '../constants/checklist'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../constants/checklist'
import { createNotification } from '../utils/notifications'
import { logFlatHistory } from '../utils/flatHistory'

export function validateAndSubmitFromSync(inspectionId: string, isResubmit: boolean): void {
  const db = getDB()
  const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId) as Record<string, unknown>
  if (!inspection) throw new Error('Inspection not found')

  const responses = db.prepare('SELECT * FROM responses WHERE inspection_id = ?').all(inspectionId) as Record<string, unknown>[]

  for (const r of responses) {
    if (r.status === 'fail') {
      const mandatory = getItemMandatoryImage(r.item_id as string)
      const imageCount = (db.prepare('SELECT COUNT(*) as c FROM images WHERE response_id = ?').get(r.id) as { c: number }).c
      if (mandatory && imageCount === 0) throw new Error(`Image required for ${r.item_id}`)
    }
  }

  for (const r of responses) {
    if (r.status === 'fail' && !r.snag_id) {
      const snagId = uuidv4()
      const cat = DEFAULT_CHECKLIST_CATEGORIES.find((c) => c.id === r.category_id)
      const item = cat?.items.find((i) => i.id === r.item_id)
      db.prepare(
        `INSERT INTO snags (id, inspection_id, response_id, flat_id, project_id, category, item_label, description, severity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'minor')`
      ).run(snagId, inspectionId, r.id, inspection.flat_id, inspection.project_id, cat?.name || '', item?.label || '', r.remarks || '')
      db.prepare('UPDATE responses SET snag_id = ? WHERE id = ?').run(snagId, r.id)
    }
  }

  db.prepare(`UPDATE inspections SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?`).run(inspectionId)
  db.prepare(`UPDATE flats SET status = 'submitted' WHERE id = ?`).run(inspection.flat_id)

  logFlatHistory({
    flatId: inspection.flat_id as string,
    eventType: isResubmit ? 'inspection_resubmitted' : 'inspection_submitted',
    actorId: inspection.engineer_id as string,
    title: isResubmit ? 'Resubmitted for QA review' : 'Submitted for QA review',
    description: 'Inspection synced and submitted for QA review.',
    metadata: { inspectionId },
  })

  const assignment = db.prepare('SELECT qa_id FROM assignments WHERE flat_id = ?').get(inspection.flat_id) as { qa_id: string }
  if (assignment) {
    createNotification(assignment.qa_id, 'inspection_submitted', 'Inspection Submitted', 'Ready for review', inspection.flat_id as string)
  }
}
