export declare function rowToTower(row: Record<string, unknown>): {
    id: unknown;
    projectId: unknown;
    name: unknown;
    totalFloors: unknown;
    unitsPerFloor: unknown;
    unitPrefix: unknown;
    startNumber: unknown;
    createdAt: unknown;
};
export declare function rowToFloor(row: Record<string, unknown>): {
    id: unknown;
    towerId: unknown;
    projectId: unknown;
    floorNumber: unknown;
    label: unknown;
};
export declare function rowToFlat(row: Record<string, unknown>): {
    id: unknown;
    towerId: unknown;
    projectId: unknown;
    floorId: unknown;
    flatNumber: unknown;
    floor: unknown;
    status: unknown;
    createdAt: unknown;
};
export declare function rowToInspection(row: Record<string, unknown>): {
    id: unknown;
    flatId: unknown;
    projectId: unknown;
    towerId: unknown;
    floorId: unknown;
    engineerId: unknown;
    templateId: unknown;
    status: unknown;
    submittedAt: {} | undefined;
    lastUpdated: unknown;
    syncedAt: {} | undefined;
};
export declare function rowToResponse(row: Record<string, unknown>, images?: unknown[]): {
    id: unknown;
    inspectionId: unknown;
    itemId: unknown;
    categoryId: unknown;
    status: unknown;
    remarks: unknown;
    qaRemarks: unknown;
    snagId: {} | undefined;
    images: unknown[];
    updatedAt: unknown;
};
export declare function rowToSnag(row: Record<string, unknown>, beforeImages?: unknown[], afterImages?: unknown[]): {
    id: unknown;
    inspectionId: unknown;
    responseId: unknown;
    flatId: unknown;
    projectId: unknown;
    category: unknown;
    itemLabel: unknown;
    description: unknown;
    severity: unknown;
    status: unknown;
    assignedTo: {} | undefined;
    beforeImages: unknown[];
    afterImages: unknown[];
    remarks: unknown;
    createdAt: unknown;
    updatedAt: unknown;
    closedAt: {} | undefined;
};
export declare function rowToImage(row: Record<string, unknown>): {
    id: unknown;
    inspectionId: unknown;
    snagId: {} | undefined;
    responseId: {} | undefined;
    itemId: {} | undefined;
    type: unknown;
    url: unknown;
    thumbnailUrl: {} | undefined;
    caption: unknown;
    uploadedAt: unknown;
    syncedAt: {} | undefined;
};
//# sourceMappingURL=mappers.d.ts.map