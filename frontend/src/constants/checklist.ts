import type { InspectionResponse, ResponseStatus } from '../types'

export const DEFAULT_CHECKLIST_CATEGORIES = [
  {
    id: 'civil',
    name: 'Civil',
    icon: 'Building2',
    items: [
      { id: 'civil_01', label: 'Floor Leveling', isMandatoryImage: true },
      { id: 'civil_02', label: 'Tile Alignment', isMandatoryImage: true },
      { id: 'civil_03', label: 'Grouting', isMandatoryImage: false },
      { id: 'civil_04', label: 'Tile Finishing', isMandatoryImage: true },
      { id: 'civil_05', label: 'Skirting', isMandatoryImage: false },
      { id: 'civil_06', label: 'Wall Plaster', isMandatoryImage: false },
      { id: 'civil_07', label: 'Ceiling Plaster', isMandatoryImage: false },
      { id: 'civil_08', label: 'Column Finishing', isMandatoryImage: false },
      { id: 'civil_09', label: 'Beam Finishing', isMandatoryImage: false },
      { id: 'civil_10', label: 'Staircase Finishing', isMandatoryImage: false },
      { id: 'civil_11', label: 'Waterproofing (Toilet)', isMandatoryImage: true },
      { id: 'civil_12', label: 'Waterproofing (Terrace)', isMandatoryImage: true },
      { id: 'civil_13', label: 'False Ceiling', isMandatoryImage: false },
      { id: 'civil_14', label: 'Granite / Marble Work', isMandatoryImage: false },
      { id: 'civil_15', label: 'Kitchen Platform', isMandatoryImage: false },
      { id: 'civil_16', label: 'Step Nosing', isMandatoryImage: false },
      { id: 'civil_17', label: 'Expansion Joint', isMandatoryImage: false },
      { id: 'civil_18', label: 'Sunken Slab Filling', isMandatoryImage: false },
      { id: 'civil_19', label: 'Chajja / Canopy', isMandatoryImage: false },
      { id: 'civil_20', label: 'External Plaster', isMandatoryImage: false },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'Zap',
    items: [
      { id: 'elec_01', label: 'DP Board Fixing', isMandatoryImage: false },
      { id: 'elec_02', label: 'DP Board Dressing', isMandatoryImage: false },
      { id: 'elec_03', label: 'Wiring Completion', isMandatoryImage: false },
      { id: 'elec_04', label: 'Switch Plate Fixing', isMandatoryImage: false },
      { id: 'elec_05', label: 'Fan Point Wiring', isMandatoryImage: false },
      { id: 'elec_06', label: 'Light Point Wiring', isMandatoryImage: false },
      { id: 'elec_07', label: 'AC Point Wiring', isMandatoryImage: false },
      { id: 'elec_08', label: 'Earthing', isMandatoryImage: true },
      { id: 'elec_09', label: 'Gypsum / Concealment', isMandatoryImage: false },
      { id: 'elec_10', label: 'Z Fishing (Cable Routing)', isMandatoryImage: false },
      { id: 'elec_11', label: 'Electrical Testing', isMandatoryImage: false },
      { id: 'elec_12', label: 'DB Box Label', isMandatoryImage: false },
      { id: 'elec_13', label: 'MCB Connections', isMandatoryImage: true },
      { id: 'elec_14', label: 'ELCB Installation', isMandatoryImage: false },
      { id: 'elec_15', label: 'Video Door Phone', isMandatoryImage: false },
    ],
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'Droplets',
    items: [
      { id: 'plmb_01', label: 'WC / EWC Fixing', isMandatoryImage: false },
      { id: 'plmb_02', label: 'Wash Basin Fixing', isMandatoryImage: false },
      { id: 'plmb_03', label: 'CP Fittings (Taps)', isMandatoryImage: false },
      { id: 'plmb_04', label: 'Shower Fittings', isMandatoryImage: false },
      { id: 'plmb_05', label: 'Concealed Plumbing', isMandatoryImage: false },
      { id: 'plmb_06', label: 'Water Supply Lines', isMandatoryImage: false },
      { id: 'plmb_07', label: 'Drainage Lines', isMandatoryImage: false },
      { id: 'plmb_08', label: 'Pressure Testing', isMandatoryImage: true },
      { id: 'plmb_09', label: 'Flush Tank Fitting', isMandatoryImage: false },
      { id: 'plmb_10', label: 'Water Heater Point', isMandatoryImage: false },
    ],
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: 'Paintbrush',
    items: [
      { id: 'paint_01', label: 'Putty 1st Coat', isMandatoryImage: false },
      { id: 'paint_02', label: 'Putty 2nd Coat', isMandatoryImage: false },
      { id: 'paint_03', label: 'Primer Coat', isMandatoryImage: false },
      { id: 'paint_04', label: 'Single Coat Paint', isMandatoryImage: false },
      { id: 'paint_05', label: 'Double Coat Paint', isMandatoryImage: false },
      { id: 'paint_06', label: 'Paint Finish Quality', isMandatoryImage: true },
      { id: 'paint_07', label: 'Colour Uniformity', isMandatoryImage: true },
      { id: 'paint_08', label: 'External Paint', isMandatoryImage: false },
      { id: 'paint_09', label: 'Texture Paint', isMandatoryImage: false },
      { id: 'paint_10', label: 'Waterproof Paint (Toilet)', isMandatoryImage: false },
    ],
  },
  {
    id: 'doors_windows',
    name: 'Doors & Windows',
    icon: 'Square',
    items: [
      { id: 'dw_01', label: 'Main Door Frame', isMandatoryImage: false },
      { id: 'dw_02', label: 'Main Door Polishing', isMandatoryImage: false },
      { id: 'dw_03', label: 'Main Door Lock (Dead Lock)', isMandatoryImage: false },
      { id: 'dw_04', label: 'Main Door Lock (Digital)', isMandatoryImage: false },
      { id: 'dw_05', label: 'Internal Door Frames', isMandatoryImage: false },
      { id: 'dw_06', label: 'Internal Doors Fitting', isMandatoryImage: false },
      { id: 'dw_07', label: 'Door Polish / Dhar Polish', isMandatoryImage: false },
      { id: 'dw_08', label: 'Aluminium Window (Living)', isMandatoryImage: false },
      { id: 'dw_09', label: 'Aluminium Window (Bedroom 1)', isMandatoryImage: false },
      { id: 'dw_10', label: 'Aluminium Window (Bedroom 2)', isMandatoryImage: false },
      { id: 'dw_11', label: 'Aluminium Window (Kitchen)', isMandatoryImage: false },
      { id: 'dw_12', label: 'Aluminium Window (Toilets)', isMandatoryImage: false },
      { id: 'dw_13', label: 'Mosquito Net / Mesh', isMandatoryImage: false },
      { id: 'dw_14', label: 'Glass Work (Railing)', isMandatoryImage: true },
      { id: 'dw_15', label: 'Sliding Doors', isMandatoryImage: false },
    ],
  },
  {
    id: 'fire_safety',
    name: 'Fire & Safety',
    icon: 'Flame',
    items: [
      { id: 'fire_01', label: 'Sprinkler Installation', isMandatoryImage: false },
      { id: 'fire_02', label: 'Smoke Detector', isMandatoryImage: false },
      { id: 'fire_03', label: 'Heat Detector', isMandatoryImage: false },
      { id: 'fire_04', label: 'Fire Fighting Piping', isMandatoryImage: false },
      { id: 'fire_05', label: 'Flat / Passage Coverage', isMandatoryImage: false },
      { id: 'fire_06', label: 'Sprinkler Testing', isMandatoryImage: true },
      { id: 'fire_07', label: 'Fire Alarm Panel', isMandatoryImage: false },
      { id: 'fire_08', label: 'Emergency Exit Signage', isMandatoryImage: false },
    ],
  },
  {
    id: 'kitchen',
    name: 'Modular Kitchen',
    icon: 'ChefHat',
    items: [
      { id: 'kitchen_01', label: 'Cabinet Frame Fixing', isMandatoryImage: false },
      { id: 'kitchen_02', label: 'Shutter Alignment', isMandatoryImage: true },
      { id: 'kitchen_03', label: 'Shutter Polish/Finish', isMandatoryImage: false },
      { id: 'kitchen_04', label: 'Countertop Fixing', isMandatoryImage: false },
      { id: 'kitchen_05', label: 'Sink Fixing', isMandatoryImage: false },
      { id: 'kitchen_06', label: 'Overhead Cabinets', isMandatoryImage: false },
      { id: 'kitchen_07', label: 'Chimney Point', isMandatoryImage: false },
    ],
  },
  {
    id: 'railing',
    name: 'Railing & Deck',
    icon: 'Layers',
    items: [
      { id: 'rail_01', label: 'Base / Shoe Work', isMandatoryImage: false },
      { id: 'rail_02', label: 'Glass Railing Panels', isMandatoryImage: true },
      { id: 'rail_03', label: 'Top Hand Rail', isMandatoryImage: false },
      { id: 'rail_04', label: 'Balcony Railing', isMandatoryImage: false },
      { id: 'rail_05', label: 'Staircase Railing', isMandatoryImage: false },
      { id: 'rail_06', label: 'Deck Flooring', isMandatoryImage: false },
    ],
  },
]

export const TOTAL_ITEMS = DEFAULT_CHECKLIST_CATEGORIES.reduce(
  (acc, cat) => acc + cat.items.length,
  0
)

export function buildEmptyResponses(
  inspectionId: string,
  _templateId: string
): InspectionResponse[] {
  return DEFAULT_CHECKLIST_CATEGORIES.flatMap((cat) =>
    cat.items.map((item) => ({
      id: `${inspectionId}_${item.id}`,
      inspectionId,
      itemId: item.id,
      categoryId: cat.id,
      status: 'pending' as ResponseStatus,
      remarks: '',
      qaRemarks: '',
      images: [],
      updatedAt: new Date().toISOString(),
    }))
  )
}

export function getItemById(itemId: string) {
  for (const cat of DEFAULT_CHECKLIST_CATEGORIES) {
    const item = cat.items.find((i) => i.id === itemId)
    if (item) return { ...item, categoryId: cat.id, categoryName: cat.name }
  }
  return null
}
