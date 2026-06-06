// SQLite datetime('now') stores UTC timestamps without the 'Z' suffix,
// e.g. "2024-06-05 00:09:00". JavaScript parses these as local time unless
// we append 'Z' to tell it they are UTC.
function utc(ts: unknown): string | undefined {
  if (!ts) return undefined
  const s = String(ts)
  // Already has timezone info
  if (s.endsWith('Z') || s.includes('+')) return s
  // Replace the space separator with 'T' and add 'Z'
  return s.replace(' ', 'T') + 'Z'
}

export function rowToTower(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    totalFloors: row.total_floors,
    unitsPerFloor: row.units_per_floor,
    unitPrefix: row.unit_prefix,
    startNumber: row.start_number,
    createdAt: utc(row.created_at),
  }
}

export function rowToFloor(row: Record<string, unknown>) {
  return {
    id: row.id,
    towerId: row.tower_id,
    projectId: row.project_id,
    floorNumber: row.floor_number,
    label: row.label,
  }
}

export function rowToFlat(row: Record<string, unknown>) {
  return {
    id: row.id,
    towerId: row.tower_id,
    projectId: row.project_id,
    floorId: row.floor_id,
    flatNumber: row.flat_number,
    floor: row.floor,
    status: row.status,
    createdAt: utc(row.created_at),
  }
}

export function rowToInspection(row: Record<string, unknown>) {
  return {
    id: row.id,
    flatId: row.flat_id,
    projectId: row.project_id,
    towerId: row.tower_id,
    floorId: row.floor_id,
    engineerId: row.engineer_id,
    templateId: row.template_id,
    status: row.status,
    submittedAt: utc(row.submitted_at),
    lastUpdated: utc(row.last_updated),
    syncedAt: utc(row.synced_at),
  }
}

export function rowToResponse(row: Record<string, unknown>, images: unknown[] = []) {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    itemId: row.item_id,
    categoryId: row.category_id,
    status: row.status,
    remarks: row.remarks,
    qaRemarks: row.qa_remarks,
    snagId: row.snag_id || undefined,
    images,
    updatedAt: utc(row.updated_at),
  }
}

export function rowToSnag(row: Record<string, unknown>, beforeImages: unknown[] = [], afterImages: unknown[] = []) {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    responseId: row.response_id,
    flatId: row.flat_id,
    projectId: row.project_id,
    category: row.category,
    itemLabel: row.item_label,
    description: row.description,
    severity: row.severity,
    status: row.status,
    assignedTo: row.assigned_to || undefined,
    beforeImages,
    afterImages,
    remarks: row.remarks,
    createdAt: utc(row.created_at),
    updatedAt: utc(row.updated_at),
    closedAt: utc(row.closed_at),
  }
}

export function rowToImage(row: Record<string, unknown>) {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    snagId: row.snag_id || undefined,
    responseId: row.response_id || undefined,
    itemId: row.item_id || undefined,
    type: row.type,
    url: row.url,
    thumbnailUrl: row.thumbnail_url || undefined,
    caption: row.caption,
    uploadedAt: utc(row.uploaded_at),
    syncedAt: utc(row.synced_at),
  }
}
