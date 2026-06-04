"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CHECKLIST_CATEGORIES = void 0;
exports.getAllTemplateItems = getAllTemplateItems;
exports.getItemMandatoryImage = getItemMandatoryImage;
exports.DEFAULT_CHECKLIST_CATEGORIES = [
    {
        id: 'civil',
        name: 'Civil',
        icon: 'Building2',
        sortOrder: 1,
        items: [
            { id: 'civil_01', categoryId: 'civil', label: 'Floor Leveling', isMandatoryImage: true, sortOrder: 1 },
            { id: 'civil_02', categoryId: 'civil', label: 'Tile Alignment', isMandatoryImage: true, sortOrder: 2 },
            { id: 'civil_03', categoryId: 'civil', label: 'Grouting', isMandatoryImage: false, sortOrder: 3 },
            { id: 'civil_04', categoryId: 'civil', label: 'Tile Finishing', isMandatoryImage: true, sortOrder: 4 },
            { id: 'civil_05', categoryId: 'civil', label: 'Skirting', isMandatoryImage: false, sortOrder: 5 },
            { id: 'civil_06', categoryId: 'civil', label: 'Wall Plaster', isMandatoryImage: false, sortOrder: 6 },
            { id: 'civil_07', categoryId: 'civil', label: 'Ceiling Plaster', isMandatoryImage: false, sortOrder: 7 },
            { id: 'civil_08', categoryId: 'civil', label: 'Column Finishing', isMandatoryImage: false, sortOrder: 8 },
            { id: 'civil_09', categoryId: 'civil', label: 'Beam Finishing', isMandatoryImage: false, sortOrder: 9 },
            { id: 'civil_10', categoryId: 'civil', label: 'Staircase Finishing', isMandatoryImage: false, sortOrder: 10 },
            { id: 'civil_11', categoryId: 'civil', label: 'Waterproofing (Toilet)', isMandatoryImage: true, sortOrder: 11 },
            { id: 'civil_12', categoryId: 'civil', label: 'Waterproofing (Terrace)', isMandatoryImage: true, sortOrder: 12 },
            { id: 'civil_13', categoryId: 'civil', label: 'False Ceiling', isMandatoryImage: false, sortOrder: 13 },
            { id: 'civil_14', categoryId: 'civil', label: 'Granite / Marble Work', isMandatoryImage: false, sortOrder: 14 },
            { id: 'civil_15', categoryId: 'civil', label: 'Kitchen Platform', isMandatoryImage: false, sortOrder: 15 },
            { id: 'civil_16', categoryId: 'civil', label: 'Step Nosing', isMandatoryImage: false, sortOrder: 16 },
            { id: 'civil_17', categoryId: 'civil', label: 'Expansion Joint', isMandatoryImage: false, sortOrder: 17 },
            { id: 'civil_18', categoryId: 'civil', label: 'Sunken Slab Filling', isMandatoryImage: false, sortOrder: 18 },
            { id: 'civil_19', categoryId: 'civil', label: 'Chajja / Canopy', isMandatoryImage: false, sortOrder: 19 },
            { id: 'civil_20', categoryId: 'civil', label: 'External Plaster', isMandatoryImage: false, sortOrder: 20 },
        ],
    },
    {
        id: 'electrical',
        name: 'Electrical',
        icon: 'Zap',
        sortOrder: 2,
        items: [
            { id: 'elec_01', categoryId: 'electrical', label: 'DP Board Fixing', isMandatoryImage: false, sortOrder: 1 },
            { id: 'elec_02', categoryId: 'electrical', label: 'DP Board Dressing', isMandatoryImage: false, sortOrder: 2 },
            { id: 'elec_03', categoryId: 'electrical', label: 'Wiring Completion', isMandatoryImage: false, sortOrder: 3 },
            { id: 'elec_04', categoryId: 'electrical', label: 'Switch Plate Fixing', isMandatoryImage: false, sortOrder: 4 },
            { id: 'elec_05', categoryId: 'electrical', label: 'Fan Point Wiring', isMandatoryImage: false, sortOrder: 5 },
            { id: 'elec_06', categoryId: 'electrical', label: 'Light Point Wiring', isMandatoryImage: false, sortOrder: 6 },
            { id: 'elec_07', categoryId: 'electrical', label: 'AC Point Wiring', isMandatoryImage: false, sortOrder: 7 },
            { id: 'elec_08', categoryId: 'electrical', label: 'Earthing', isMandatoryImage: true, sortOrder: 8 },
            { id: 'elec_09', categoryId: 'electrical', label: 'Gypsum / Concealment', isMandatoryImage: false, sortOrder: 9 },
            { id: 'elec_10', categoryId: 'electrical', label: 'Z Fishing (Cable Routing)', isMandatoryImage: false, sortOrder: 10 },
            { id: 'elec_11', categoryId: 'electrical', label: 'Electrical Testing', isMandatoryImage: false, sortOrder: 11 },
            { id: 'elec_12', categoryId: 'electrical', label: 'DB Box Label', isMandatoryImage: false, sortOrder: 12 },
            { id: 'elec_13', categoryId: 'electrical', label: 'MCB Connections', isMandatoryImage: true, sortOrder: 13 },
            { id: 'elec_14', categoryId: 'electrical', label: 'ELCB Installation', isMandatoryImage: false, sortOrder: 14 },
            { id: 'elec_15', categoryId: 'electrical', label: 'Video Door Phone', isMandatoryImage: false, sortOrder: 15 },
        ],
    },
    {
        id: 'plumbing',
        name: 'Plumbing',
        icon: 'Droplets',
        sortOrder: 3,
        items: [
            { id: 'plmb_01', categoryId: 'plumbing', label: 'WC / EWC Fixing', isMandatoryImage: false, sortOrder: 1 },
            { id: 'plmb_02', categoryId: 'plumbing', label: 'Wash Basin Fixing', isMandatoryImage: false, sortOrder: 2 },
            { id: 'plmb_03', categoryId: 'plumbing', label: 'CP Fittings (Taps)', isMandatoryImage: false, sortOrder: 3 },
            { id: 'plmb_04', categoryId: 'plumbing', label: 'Shower Fittings', isMandatoryImage: false, sortOrder: 4 },
            { id: 'plmb_05', categoryId: 'plumbing', label: 'Concealed Plumbing', isMandatoryImage: false, sortOrder: 5 },
            { id: 'plmb_06', categoryId: 'plumbing', label: 'Water Supply Lines', isMandatoryImage: false, sortOrder: 6 },
            { id: 'plmb_07', categoryId: 'plumbing', label: 'Drainage Lines', isMandatoryImage: false, sortOrder: 7 },
            { id: 'plmb_08', categoryId: 'plumbing', label: 'Pressure Testing', isMandatoryImage: true, sortOrder: 8 },
            { id: 'plmb_09', categoryId: 'plumbing', label: 'Flush Tank Fitting', isMandatoryImage: false, sortOrder: 9 },
            { id: 'plmb_10', categoryId: 'plumbing', label: 'Water Heater Point', isMandatoryImage: false, sortOrder: 10 },
        ],
    },
    {
        id: 'painting',
        name: 'Painting',
        icon: 'Paintbrush',
        sortOrder: 4,
        items: [
            { id: 'paint_01', categoryId: 'painting', label: 'Putty 1st Coat', isMandatoryImage: false, sortOrder: 1 },
            { id: 'paint_02', categoryId: 'painting', label: 'Putty 2nd Coat', isMandatoryImage: false, sortOrder: 2 },
            { id: 'paint_03', categoryId: 'painting', label: 'Primer Coat', isMandatoryImage: false, sortOrder: 3 },
            { id: 'paint_04', categoryId: 'painting', label: 'Single Coat Paint', isMandatoryImage: false, sortOrder: 4 },
            { id: 'paint_05', categoryId: 'painting', label: 'Double Coat Paint', isMandatoryImage: false, sortOrder: 5 },
            { id: 'paint_06', categoryId: 'painting', label: 'Paint Finish Quality', isMandatoryImage: true, sortOrder: 6 },
            { id: 'paint_07', categoryId: 'painting', label: 'Colour Uniformity', isMandatoryImage: true, sortOrder: 7 },
            { id: 'paint_08', categoryId: 'painting', label: 'External Paint', isMandatoryImage: false, sortOrder: 8 },
            { id: 'paint_09', categoryId: 'painting', label: 'Texture Paint', isMandatoryImage: false, sortOrder: 9 },
            { id: 'paint_10', categoryId: 'painting', label: 'Waterproof Paint (Toilet)', isMandatoryImage: false, sortOrder: 10 },
        ],
    },
    {
        id: 'doors_windows',
        name: 'Doors & Windows',
        icon: 'Square',
        sortOrder: 5,
        items: [
            { id: 'dw_01', categoryId: 'doors_windows', label: 'Main Door Frame', isMandatoryImage: false, sortOrder: 1 },
            { id: 'dw_02', categoryId: 'doors_windows', label: 'Main Door Polishing', isMandatoryImage: false, sortOrder: 2 },
            { id: 'dw_03', categoryId: 'doors_windows', label: 'Main Door Lock (Dead Lock)', isMandatoryImage: false, sortOrder: 3 },
            { id: 'dw_04', categoryId: 'doors_windows', label: 'Main Door Lock (Digital)', isMandatoryImage: false, sortOrder: 4 },
            { id: 'dw_05', categoryId: 'doors_windows', label: 'Internal Door Frames', isMandatoryImage: false, sortOrder: 5 },
            { id: 'dw_06', categoryId: 'doors_windows', label: 'Internal Doors Fitting', isMandatoryImage: false, sortOrder: 6 },
            { id: 'dw_07', categoryId: 'doors_windows', label: 'Door Polish / Dhar Polish', isMandatoryImage: false, sortOrder: 7 },
            { id: 'dw_08', categoryId: 'doors_windows', label: 'Aluminium Window (Living)', isMandatoryImage: false, sortOrder: 8 },
            { id: 'dw_09', categoryId: 'doors_windows', label: 'Aluminium Window (Bedroom 1)', isMandatoryImage: false, sortOrder: 9 },
            { id: 'dw_10', categoryId: 'doors_windows', label: 'Aluminium Window (Bedroom 2)', isMandatoryImage: false, sortOrder: 10 },
            { id: 'dw_11', categoryId: 'doors_windows', label: 'Aluminium Window (Kitchen)', isMandatoryImage: false, sortOrder: 11 },
            { id: 'dw_12', categoryId: 'doors_windows', label: 'Aluminium Window (Toilets)', isMandatoryImage: false, sortOrder: 12 },
            { id: 'dw_13', categoryId: 'doors_windows', label: 'Mosquito Net / Mesh', isMandatoryImage: false, sortOrder: 13 },
            { id: 'dw_14', categoryId: 'doors_windows', label: 'Glass Work (Railing)', isMandatoryImage: true, sortOrder: 14 },
            { id: 'dw_15', categoryId: 'doors_windows', label: 'Sliding Doors', isMandatoryImage: false, sortOrder: 15 },
        ],
    },
    {
        id: 'fire_safety',
        name: 'Fire & Safety',
        icon: 'Flame',
        sortOrder: 6,
        items: [
            { id: 'fire_01', categoryId: 'fire_safety', label: 'Sprinkler Installation', isMandatoryImage: false, sortOrder: 1 },
            { id: 'fire_02', categoryId: 'fire_safety', label: 'Smoke Detector', isMandatoryImage: false, sortOrder: 2 },
            { id: 'fire_03', categoryId: 'fire_safety', label: 'Heat Detector', isMandatoryImage: false, sortOrder: 3 },
            { id: 'fire_04', categoryId: 'fire_safety', label: 'Fire Fighting Piping', isMandatoryImage: false, sortOrder: 4 },
            { id: 'fire_05', categoryId: 'fire_safety', label: 'Flat / Passage Coverage', isMandatoryImage: false, sortOrder: 5 },
            { id: 'fire_06', categoryId: 'fire_safety', label: 'Sprinkler Testing', isMandatoryImage: true, sortOrder: 6 },
            { id: 'fire_07', categoryId: 'fire_safety', label: 'Fire Alarm Panel', isMandatoryImage: false, sortOrder: 7 },
            { id: 'fire_08', categoryId: 'fire_safety', label: 'Emergency Exit Signage', isMandatoryImage: false, sortOrder: 8 },
        ],
    },
    {
        id: 'kitchen',
        name: 'Modular Kitchen',
        icon: 'ChefHat',
        sortOrder: 7,
        items: [
            { id: 'kitchen_01', categoryId: 'kitchen', label: 'Cabinet Frame Fixing', isMandatoryImage: false, sortOrder: 1 },
            { id: 'kitchen_02', categoryId: 'kitchen', label: 'Shutter Alignment', isMandatoryImage: true, sortOrder: 2 },
            { id: 'kitchen_03', categoryId: 'kitchen', label: 'Shutter Polish/Finish', isMandatoryImage: false, sortOrder: 3 },
            { id: 'kitchen_04', categoryId: 'kitchen', label: 'Countertop Fixing', isMandatoryImage: false, sortOrder: 4 },
            { id: 'kitchen_05', categoryId: 'kitchen', label: 'Sink Fixing', isMandatoryImage: false, sortOrder: 5 },
            { id: 'kitchen_06', categoryId: 'kitchen', label: 'Overhead Cabinets', isMandatoryImage: false, sortOrder: 6 },
            { id: 'kitchen_07', categoryId: 'kitchen', label: 'Chimney Point', isMandatoryImage: false, sortOrder: 7 },
        ],
    },
    {
        id: 'railing',
        name: 'Railing & Deck',
        icon: 'Layers',
        sortOrder: 8,
        items: [
            { id: 'rail_01', categoryId: 'railing', label: 'Base / Shoe Work', isMandatoryImage: false, sortOrder: 1 },
            { id: 'rail_02', categoryId: 'railing', label: 'Glass Railing Panels', isMandatoryImage: true, sortOrder: 2 },
            { id: 'rail_03', categoryId: 'railing', label: 'Top Hand Rail', isMandatoryImage: false, sortOrder: 3 },
            { id: 'rail_04', categoryId: 'railing', label: 'Balcony Railing', isMandatoryImage: false, sortOrder: 4 },
            { id: 'rail_05', categoryId: 'railing', label: 'Staircase Railing', isMandatoryImage: false, sortOrder: 5 },
            { id: 'rail_06', categoryId: 'railing', label: 'Deck Flooring', isMandatoryImage: false, sortOrder: 6 },
        ],
    },
];
function getAllTemplateItems() {
    return exports.DEFAULT_CHECKLIST_CATEGORIES.flatMap((cat) => cat.items.map((item) => ({ ...item, categoryName: cat.name })));
}
function getItemMandatoryImage(itemId) {
    for (const cat of exports.DEFAULT_CHECKLIST_CATEGORIES) {
        const item = cat.items.find((i) => i.id === itemId);
        if (item)
            return item.isMandatoryImage;
    }
    return false;
}
//# sourceMappingURL=checklist.js.map