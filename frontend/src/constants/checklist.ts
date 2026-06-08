import type { InspectionResponse, ResponseStatus } from '../types'

export const DEFAULT_CHECKLIST_CATEGORIES = [
  {
    id: 'electrical',
    name: 'Electrical Work',
    icon: 'Zap',
    sortOrder: 1,
    items: [
      { id: 'elec_01', label: 'DP Board Fixing',          isMandatoryImage: false },
      { id: 'elec_02', label: 'DP Board Dressing',        isMandatoryImage: false },
      { id: 'elec_03', label: 'Wiring',                   isMandatoryImage: false },
      { id: 'elec_04', label: 'Switch Plate Fixing',      isMandatoryImage: false },
      { id: 'elec_05', label: 'Gypsum',                   isMandatoryImage: false },
      { id: 'elec_06', label: 'Z Fishing',                isMandatoryImage: false },
    ],
  },
  {
    id: 'plumbing',
    name: 'Plumbing Work',
    icon: 'Droplets',
    sortOrder: 2,
    items: [
      { id: 'plmb_01', label: 'Sanitary',                 isMandatoryImage: false },
      { id: 'plmb_02', label: 'W/C',                      isMandatoryImage: false },
      { id: 'plmb_03', label: 'Wash Basin',               isMandatoryImage: false },
      { id: 'plmb_04', label: 'CP Fittings',              isMandatoryImage: false },
    ],
  },
  {
    id: 'tiling',
    name: 'Tiling Work',
    icon: 'Grid3x3',
    sortOrder: 3,
    items: [
      { id: 'tile_01', label: 'Tiling Work',              isMandatoryImage: true },
    ],
  },
  {
    id: 'painting',
    name: 'Internal Painting Work',
    icon: 'Paintbrush',
    sortOrder: 4,
    items: [
      { id: 'paint_01', label: 'Sanding',                 isMandatoryImage: false },
      { id: 'paint_02', label: 'Putty 1st Coat',          isMandatoryImage: false },
      { id: 'paint_03', label: 'Putty 2nd Coat',          isMandatoryImage: false },
      { id: 'paint_04', label: 'Putty Sanding',           isMandatoryImage: false },
      { id: 'paint_05', label: 'Primer Work',             isMandatoryImage: false },
      { id: 'paint_06', label: 'Single Coat',             isMandatoryImage: false },
      { id: 'paint_07', label: 'Double Coat',             isMandatoryImage: true  },
    ],
  },
  {
    id: 'railing',
    name: 'Deck / Kitchen Railing Work',
    icon: 'Layers',
    sortOrder: 5,
    items: [
      { id: 'rail_01', label: 'Base / Shoe Work',         isMandatoryImage: false },
      { id: 'rail_02', label: 'Glass Work',               isMandatoryImage: true  },
      { id: 'rail_03', label: 'Top and Hand Rail Work',   isMandatoryImage: false },
    ],
  },
  {
    id: 'aluminium_window',
    name: 'Aluminium Window',
    icon: 'AppWindow',
    sortOrder: 6,
    items: [
      { id: 'aw_01', label: 'Living',                     isMandatoryImage: false },
      { id: 'aw_02', label: 'Common Bedroom',             isMandatoryImage: false },
      { id: 'aw_03', label: 'Master Bedroom 1',           isMandatoryImage: false },
      { id: 'aw_04', label: 'Master Bedroom 2',           isMandatoryImage: false },
      { id: 'aw_05', label: 'Common Toilet',              isMandatoryImage: false },
      { id: 'aw_06', label: 'Master Toilet 1',            isMandatoryImage: false },
      { id: 'aw_07', label: 'Master Toilet 2',            isMandatoryImage: false },
      { id: 'aw_08', label: 'Kitchen',                    isMandatoryImage: false },
      { id: 'aw_09', label: 'Servant Toilet',             isMandatoryImage: false },
    ],
  },
  {
    id: 'kitchen',
    name: 'Modular Kitchen',
    icon: 'ChefHat',
    sortOrder: 7,
    items: [
      { id: 'kit_01', label: 'Shutter Fitting',           isMandatoryImage: false },
      { id: 'kit_02', label: 'Shutter Alignment',         isMandatoryImage: true  },
    ],
  },
  {
    id: 'fire_safety',
    name: 'Fire Fighting Work',
    icon: 'Flame',
    sortOrder: 8,
    items: [
      { id: 'fire_01', label: 'Flat / Passage',           isMandatoryImage: false },
      { id: 'fire_02', label: 'Piping',                   isMandatoryImage: false },
      { id: 'fire_03', label: 'Sprinkler',                isMandatoryImage: false },
      { id: 'fire_04', label: 'Smoke / Heat Detector',    isMandatoryImage: false },
      { id: 'fire_05', label: 'Testing',                  isMandatoryImage: true  },
      { id: 'fire_06', label: 'Colour Coding',            isMandatoryImage: false },
    ],
  },
  {
    id: 'cabling',
    name: 'Cabling Work',
    icon: 'Cable',
    sortOrder: 9,
    items: [
      { id: 'cab_01', label: 'Main Door with Laminate',   isMandatoryImage: false },
      { id: 'cab_02', label: 'Main Door Lock (Dead Lock)',isMandatoryImage: false },
      { id: 'cab_03', label: 'Main Door Lock (Digital)',  isMandatoryImage: false },
      { id: 'cab_04', label: 'Internal Door',             isMandatoryImage: false },
      { id: 'cab_05', label: 'Internal Door Lock',        isMandatoryImage: false },
      { id: 'cab_06', label: 'Video Door Phone',          isMandatoryImage: false },
      { id: 'cab_07', label: 'Cabling Work',              isMandatoryImage: false },
      { id: 'cab_08', label: 'Indoor Display',            isMandatoryImage: false },
      { id: 'cab_09', label: 'Outdoor Camera',            isMandatoryImage: false },
    ],
  },
  {
    id: 'wooden_polishing',
    name: 'Wooden Polishing Work',
    icon: 'TreePine',
    sortOrder: 10,
    items: [
      { id: 'wood_01', label: 'Main Door Frame Polish',   isMandatoryImage: false },
      { id: 'wood_02', label: 'Internal Door Dhar Polish',isMandatoryImage: false },
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
