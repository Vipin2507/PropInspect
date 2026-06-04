export declare const DEFAULT_CHECKLIST_CATEGORIES: {
    id: string;
    name: string;
    icon: string;
    sortOrder: number;
    items: {
        id: string;
        categoryId: string;
        label: string;
        isMandatoryImage: boolean;
        sortOrder: number;
    }[];
}[];
export declare function getAllTemplateItems(): {
    categoryName: string;
    id: string;
    categoryId: string;
    label: string;
    isMandatoryImage: boolean;
    sortOrder: number;
}[];
export declare function getItemMandatoryImage(itemId: string): boolean;
//# sourceMappingURL=checklist.d.ts.map