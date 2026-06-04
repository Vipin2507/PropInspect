export function rowToTower(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    totalFloors: row.total_floors,
    unitsPerFloor: row.units_per_floor,
    unitPrefix: row.unit_prefix,
    startNumber: row.start_number,
    createdAt: row.created_at,
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
    createdAt: row.created_at,
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
    submittedAt: row.submitted_at || undefined,
    lastUpdated: row.last_updated,
    syncedAt: row.synced_at || undefined,
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
    updatedAt: row.updated_at,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at || undefined,
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
    uploadedAt: row.uploaded_at,
    syncedAt: row.synced_at || undefined,
  }
}
