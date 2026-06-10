/**
 * Bulk Upload — Inspection Checklist Format
 *
 * Excel layout (matches the sample):
 *   Row 1 (header):  "Flat number" | 106 | 107 | 108 | 206 | ...
 *   Body rows:       "<item label>" | Pass/N.A/(blank) | ...
 *   Category rows:   Bold section headers — detected by absence of any Pass/N.A value
 *                    across the row (we skip them automatically).
 *
 * Cell value mapping:
 *   "Pass"  → response status = "pass"
 *   "N.A"   → response status = "na"
 *   blank   → response status = "pending"
 *
 * Template download generates the same layout pre-filled from current DB state.
 */

import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { v4 as uuidv4 } from 'uuid'
import { getDB, utcTs } from '../db/database'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../middleware/errorHandler'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../constants/checklist'

const router = Router()
router.use(authenticate, requireRole('admin'))

// ── Multer ───────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.originalname.match(/\.(xlsx|xls)$/i) ||
      [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ].includes(file.mimetype)
    if (ok) cb(null, true)
    else cb(new Error('Only .xlsx / .xls files are accepted'))
  },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a map of normalised label → item id from the checklist constants */
function buildItemLabelMap(): Map<string, { itemId: string; categoryId: string }> {
  const map = new Map<string, { itemId: string; categoryId: string }>()
  for (const cat of DEFAULT_CHECKLIST_CATEGORIES) {
    for (const item of cat.items) {
      map.set(normaliseLabel(item.label), { itemId: item.id, categoryId: cat.id })
    }
  }
  return map
}

function normaliseLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Map Excel cell value → DB response status */
function cellToStatus(val: unknown): 'pass' | 'na' | 'pending' {
  if (!val) return 'pending'
  const s = String(val).trim().toLowerCase()
  if (s === 'pass') return 'pass'
  if (s === 'n.a' || s === 'na' || s === 'n/a') return 'na'
  return 'pending'
}

/** Ensure an inspection + responses exist for a flat, return inspectionId */
function ensureInspection(flatId: string, adminId: string): string {
  const db = getDB()
  const existing = db
    .prepare('SELECT id FROM inspections WHERE flat_id = ?')
    .get(flatId) as { id: string } | undefined
  if (existing) return existing.id

  const flat = db.prepare('SELECT * FROM flats WHERE id = ?').get(flatId) as Record<string, unknown>
  if (!flat) throw new Error(`Flat ${flatId} not found`)

  const template = db
    .prepare('SELECT id FROM checklist_templates WHERE is_default = 1 LIMIT 1')
    .get() as { id: string }
  if (!template) throw new Error('No default checklist template')

  const inspId = uuidv4()
  db.prepare(
    `INSERT INTO inspections (id, flat_id, project_id, tower_id, floor_id, engineer_id, template_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(inspId, flatId, flat.project_id, flat.tower_id, flat.floor_id, adminId, template.id)

  const insertResp = db.prepare(
    `INSERT OR IGNORE INTO responses (id, inspection_id, item_id, category_id, status)
     VALUES (?, ?, ?, ?, 'pending')`
  )
  for (const cat of DEFAULT_CHECKLIST_CATEGORIES) {
    for (const item of cat.items) {
      insertResp.run(`${inspId}_${item.id}`, inspId, item.id, cat.id)
    }
  }

  return inspId
}

// ── GET /api/bulk-upload/checklist/template?projectId=xxx ───────────────────
// Returns an .xlsx with:
//   Row 1: "Flat number" | flat101 | flat102 | …
//   Body : item label    | current status (Pass/N.A/blank) | …
//   Category headers inserted as visual separators (first column only, merged-ish)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/checklist/template',
  asyncHandler(async (req, res) => {
    const projectId = req.query.projectId as string
    if (!projectId) {
      res.status(400).json({ error: 'projectId required' })
      return
    }

    const db = getDB()

    // Fetch all flats for the project, ordered by tower + flat_number
    const flats = db.prepare(`
      SELECT f.id, f.flat_number, t.name as tower_name
      FROM flats f
      JOIN towers t ON t.id = f.tower_id
      WHERE f.project_id = ?
      ORDER BY t.name, f.flat_number
    `).all(projectId) as { id: string; flat_number: string; tower_name: string }[]

    if (flats.length === 0) {
      res.status(404).json({ error: 'No flats found for this project' })
      return
    }

    // For each flat, fetch existing responses keyed by item_id
    const responsesByFlat = new Map<string, Map<string, string>>()
    for (const flat of flats) {
      const inspection = db.prepare(`SELECT id FROM inspections WHERE flat_id = ?`).get(flat.id) as { id: string } | undefined
      const itemMap = new Map<string, string>()
      if (inspection) {
        const responses = db.prepare(`SELECT item_id, status FROM responses WHERE inspection_id = ?`).all(inspection.id) as { item_id: string; status: string }[]
        for (const r of responses) itemMap.set(r.item_id, r.status)
      }
      responsesByFlat.set(flat.id, itemMap)
    }

    // ── Build sheet data ────────────────────────────────────────────────────
    const headerRow = ['Flat number', ...flats.map((f) => f.flat_number)]
    const sheetData: (string | number)[][] = [headerRow]

    function statusToCell(s: string | undefined): string {
      if (!s || s === 'pending' || s === 'fail') return ''
      if (s === 'pass') return 'Pass'
      if (s === 'na') return 'N.A'
      return ''
    }

    for (const cat of DEFAULT_CHECKLIST_CATEGORIES) {
      // Category header row (label only, rest empty)
      sheetData.push([cat.name, ...flats.map(() => '')])

      for (const item of cat.items) {
        const row: (string | number)[] = [item.label]
        for (const flat of flats) {
          const statusMap = responsesByFlat.get(flat.id)
          const status = statusMap?.get(item.id)
          row.push(statusToCell(status))
        }
        sheetData.push(row)
      }
    }

    // ── Styles ──────────────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(sheetData)

    // Column widths: first col wide, rest narrow
    ws['!cols'] = [
      { wch: 34 },
      ...flats.map(() => ({ wch: 10 })),
    ]

    // Bold the header row + category rows
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    let currentSheetRow = 1 // 0-indexed; row 0 = header

    for (const cat of DEFAULT_CHECKLIST_CATEGORIES) {
      // Category row — bold first cell
      const cellAddr = XLSX.utils.encode_cell({ r: currentSheetRow, c: 0 })
      if (!ws[cellAddr]) ws[cellAddr] = { t: 's', v: cat.name }
      ws[cellAddr].s = { font: { bold: true } }
      currentSheetRow += 1 + cat.items.length
    }

    // Bold the header row cells
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (ws[addr]) ws[addr].s = { font: { bold: true } }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Checklist')

    // Instructions sheet
    const instrWs = XLSX.utils.aoa_to_sheet([
      ['Instructions'],
      [''],
      ['1. Do NOT change column A (item labels) or row 1 (flat numbers).'],
      ['2. Fill cells with: Pass  /  N.A  /  (leave blank)'],
      ['3. Category header rows (bold labels with no flat columns) are ignored on upload.'],
      ['4. Save as .xlsx and upload via the Admin → Project → Bulk Upload button.'],
      [''],
      ['Valid cell values:'],
      ['Pass   — item passed inspection'],
      ['N.A    — item not applicable to this flat'],
      ['(blank)— item not yet assessed (stays pending)'],
    ])
    instrWs['!cols'] = [{ wch: 70 }]
    XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="checklist-template.xlsx"`)
    res.send(buf)
  })
)

// ── POST /api/bulk-upload/checklist ─────────────────────────────────────────
// Parse uploaded file, match rows → items, columns → flats, bulk-upsert responses.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/checklist',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }

    const projectId = req.body.projectId as string
    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' })
      return
    }

    const db = getDB()

    // Parse workbook — first sheet
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]

    if (raw.length < 2) {
      res.status(400).json({ error: 'File has no data rows' })
      return
    }

    // ── Parse header row ────────────────────────────────────────────────────
    const headerRow = raw[0] as unknown[]
    // headerRow[0] = "Flat number" label, headerRow[1..] = flat numbers
    const flatNumbers: string[] = headerRow.slice(1).map((v) => String(v).trim())

    // Map flat_number → flat.id for this project
    const allFlats = db.prepare(`
      SELECT id, flat_number FROM flats WHERE project_id = ?
    `).all(projectId) as { id: string; flat_number: string }[]

    const flatIdByNumber = new Map<string, string>()
    for (const f of allFlats) flatIdByNumber.set(f.flat_number.toLowerCase(), f.id)

    // Resolve column indices → flat ids (skip columns whose flat_number isn't in project)
    const colFlats: (string | null)[] = flatNumbers.map((fn) => flatIdByNumber.get(fn.toLowerCase()) ?? null)

    // ── Build item label map ─────────────────────────────────────────────────
    const itemLabelMap = buildItemLabelMap()

    // ── Process body rows ────────────────────────────────────────────────────
    let responsesUpdated = 0
    let flatsAffected = new Set<string>()
    const skipped: { row: number; label: string; reason: string }[] = []
    const unknownItems = new Set<string>()

    // Ensure inspections exist for all flats that have at least one non-blank cell
    const inspectionIdByFlat = new Map<string, string>()
    const getOrCreateInspection = (flatId: string) => {
      if (inspectionIdByFlat.has(flatId)) return inspectionIdByFlat.get(flatId)!
      const id = ensureInspection(flatId, req.user!.id)
      inspectionIdByFlat.set(flatId, id)
      return id
    }

    const updateResponse = db.prepare(
      `UPDATE responses SET status = ?, updated_at = datetime('now') WHERE inspection_id = ? AND item_id = ?`
    )
    const insertResponse = db.prepare(
      `INSERT OR REPLACE INTO responses (id, inspection_id, item_id, category_id, status, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )

    for (let ri = 1; ri < raw.length; ri++) {
      const row = raw[ri] as unknown[]
      const labelRaw = String(row[0] ?? '').trim()
      if (!labelRaw) continue

      // Skip category header rows: no Pass/N.A values anywhere in the row
      const hasAnyValue = row.slice(1).some((v) => {
        const s = String(v ?? '').trim().toLowerCase()
        return s === 'pass' || s === 'n.a' || s === 'na' || s === 'n/a'
      })
      if (!hasAnyValue) continue // category separator row

      const normLabel = normaliseLabel(labelRaw)
      const itemInfo = itemLabelMap.get(normLabel)

      if (!itemInfo) {
        if (!unknownItems.has(labelRaw)) {
          unknownItems.add(labelRaw)
          skipped.push({ row: ri + 1, label: labelRaw, reason: 'Item label not recognised — skipped' })
        }
        continue
      }

      // Process each flat column
      for (let ci = 0; ci < colFlats.length; ci++) {
        const flatId = colFlats[ci]
        if (!flatId) continue

        const status = cellToStatus(row[ci + 1])
        // Only update/insert if it's not the default pending — or if we want to
        // explicitly record pending too (we do, to allow clearing pass back to pending)
        const inspId = getOrCreateInspection(flatId)

        const responseId = `${inspId}_${itemInfo.itemId}`
        // Try update first, then insert if not exists
        const result = updateResponse.run(status, inspId, itemInfo.itemId) as unknown as { changes: number }
        if (result.changes === 0) {
          insertResponse.run(responseId, inspId, itemInfo.itemId, itemInfo.categoryId, status)
        }

        responsesUpdated++
        flatsAffected.add(flatId)
      }
    }

    // Update flat statuses: any flat that now has all items with pass/na = submitted-ready,
    // or at least has some responses filled = in_progress
    for (const flatId of flatsAffected) {
      const inspId = inspectionIdByFlat.get(flatId)!
      const counts = db.prepare(`
        SELECT
          SUM(CASE WHEN status = 'pass'    THEN 1 ELSE 0 END) as passes,
          SUM(CASE WHEN status = 'fail'    THEN 1 ELSE 0 END) as fails,
          SUM(CASE WHEN status = 'na'      THEN 1 ELSE 0 END) as nas,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          COUNT(*) as total
        FROM responses WHERE inspection_id = ?
      `).get(inspId) as { passes: number; fails: number; nas: number; pending: number; total: number }

      // Only update flat status if it was not_started → move to in_progress
      db.prepare(
        `UPDATE flats SET status = 'in_progress' WHERE id = ? AND status = 'not_started'`
      ).run(flatId)

      // Update inspection last_updated
      db.prepare(`UPDATE inspections SET last_updated = datetime('now') WHERE id = ?`).run(inspId)
    }

    res.json({
      responsesUpdated,
      flatsAffected: flatsAffected.size,
      skipped,
      unknownItems: Array.from(unknownItems),
    })
  })
)

export default router
