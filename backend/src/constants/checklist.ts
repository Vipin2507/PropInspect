export const DEFAULT_CHECKLIST_CATEGORIES = [
  {
    id: 'electrical',
    name: 'Electrical Work',
    icon: 'Zap',
    sortOrder: 1,
    items: [
      { id: 'elec_01', categoryId: 'electrical', label: 'DP Board Fixing',          isMandatoryImage: false, sortOrder: 1 },
      { id: 'elec_02', categoryId: 'electrical', label: 'DP Board Dressing',        isMandatoryImage: false, sortOrder: 2 },
      { id: 'elec_03', categoryId: 'electrical', label: 'Wiring',                   isMandatoryImage: false, sortOrder: 3 },
      { id: 'elec_04', categoryId: 'electrical', label: 'Switch Plate Fixing',      isMandatoryImage: false, sortOrder: 4 },
      { id: 'elec_05', categoryId: 'electrical', label: 'Gypsum',                   isMandatoryImage: false, sortOrder: 5 },
      { id: 'elec_06', categoryId: 'electrical', label: 'Z Fishing',                isMandatoryImage: false, sortOrder: 6 },
    ],
  },
  {
    id: 'plumbing',
    name: 'Plumbing Work',
    icon: 'Droplets',
    sortOrder: 2,
    items: [
      { id: 'plmb_01', categoryId: 'plumbing', label: 'Sanitary',                   isMandatoryImage: false, sortOrder: 1 },
      { id: 'plmb_02', categoryId: 'plumbing', label: 'W/C',                        isMandatoryImage: false, sortOrder: 2 },
      { id: 'plmb_03', categoryId: 'plumbing', label: 'Wash Basin',                 isMandatoryImage: false, sortOrder: 3 },
      { id: 'plmb_04', categoryId: 'plumbing', label: 'CP Fittings',                isMandatoryImage: false, sortOrder: 4 },
    ],
  },
  {
    id: 'tiling',
    name: 'Tiling Work',
    icon: 'Grid3x3',
    sortOrder: 3,
    items: [
      { id: 'tile_01', categoryId: 'tiling', label: 'Tiling Work',                  isMandatoryImage: true,  sortOrder: 1 },
    ],
  },
  {
    id: 'painting',
    name: 'Internal Painting Work',
    icon: 'Paintbrush',
    sortOrder: 4,
    items: [
      { id: 'paint_01', categoryId: 'painting', label: 'Sanding',                   isMandatoryImage: false, sortOrder: 1 },
      { id: 'paint_02', categoryId: 'painting', label: 'Putty 1st Coat',            isMandatoryImage: false, sortOrder: 2 },
      { id: 'paint_03', categoryId: 'painting', label: 'Putty 2nd Coat',            isMandatoryImage: false, sortOrder: 3 },
      { id: 'paint_04', categoryId: 'painting', label: 'Putty Sanding',             isMandatoryImage: false, sortOrder: 4 },
      { id: 'paint_05', categoryId: 'painting', label: 'Primer Work',               isMandatoryImage: false, sortOrder: 5 },
      { id: 'paint_06', categoryId: 'painting', label: 'Single Coat',               isMandatoryImage: false, sortOrder: 6 },
      { id: 'paint_07', categoryId: 'painting', label: 'Double Coat',               isMandatoryImage: true,  sortOrder: 7 },
    ],
  },
  {
    id: 'railing',
    name: 'Deck / Kitchen Railing Work',
    icon: 'Layers',
    sortOrder: 5,
    items: [
      { id: 'rail_01', categoryId: 'railing', label: 'Base / Shoe Work',            isMandatoryImage: false, sortOrder: 1 },
      { id: 'rail_02', categoryId: 'railing', label: 'Glass Work',                  isMandatoryImage: true,  sortOrder: 2 },
      { id: 'rail_03', categoryId: 'railing', label: 'Top and Hand Rail Work',      isMandatoryImage: false, sortOrder: 3 },
    ],
  },
  {
    id: 'aluminium_window',
    name: 'Aluminium Window',
    icon: 'AppWindow',
    sortOrder: 6,
    items: [
      { id: 'aw_01', categoryId: 'aluminium_window', label: 'Living',               isMandatoryImage: false, sortOrder: 1 },
      { id: 'aw_02', categoryId: 'aluminium_window', label: 'Common Bedroom',       isMandatoryImage: false, sortOrder: 2 },
      { id: 'aw_03', categoryId: 'aluminium_window', label: 'Master Bedroom 1',     isMandatoryImage: false, sortOrder: 3 },
      { id: 'aw_04', categoryId: 'aluminium_window', label: 'Master Bedroom 2',     isMandatoryImage: false, sortOrder: 4 },
      { id: 'aw_05', categoryId: 'aluminium_window', label: 'Common Toilet',        isMandatoryImage: false, sortOrder: 5 },
      { id: 'aw_06', categoryId: 'aluminium_window', label: 'Master Toilet 1',      isMandatoryImage: false, sortOrder: 6 },
      { id: 'aw_07', categoryId: 'aluminium_window', label: 'Master Toilet 2',      isMandatoryImage: false, sortOrder: 7 },
      { id: 'aw_08', categoryId: 'aluminium_window', label: 'Kitchen',              isMandatoryImage: false, sortOrder: 8 },
      { id: 'aw_09', categoryId: 'aluminium_window', label: 'Servant Toilet',       isMandatoryImage: false, sortOrder: 9 },
    ],
  },
  {
    id: 'kitchen',
    name: 'Modular Kitchen',
    icon: 'ChefHat',
    sortOrder: 7,
    items: [
      { id: 'kit_01', categoryId: 'kitchen', label: 'Shutter Fitting',              isMandatoryImage: false, sortOrder: 1 },
      { id: 'kit_02', categoryId: 'kitchen', label: 'Shutter Alignment',            isMandatoryImage: true,  sortOrder: 2 },
    ],
  },
  {
    id: 'fire_safety',
    name: 'Fire Fighting Work',
    icon: 'Flame',
    sortOrder: 8,
    items: [
      { id: 'fire_01', categoryId: 'fire_safety', label: 'Flat / Passage',          isMandatoryImage: false, sortOrder: 1 },
      { id: 'fire_02', categoryId: 'fire_safety', label: 'Piping',                  isMandatoryImage: false, sortOrder: 2 },
      { id: 'fire_03', categoryId: 'fire_safety', label: 'Sprinkler',               isMandatoryImage: false, sortOrder: 3 },
      { id: 'fire_04', categoryId: 'fire_safety', label: 'Smoke / Heat Detector',   isMandatoryImage: false, sortOrder: 4 },
      { id: 'fire_05', categoryId: 'fire_safety', label: 'Testing',                 isMandatoryImage: true,  sortOrder: 5 },
      { id: 'fire_06', categoryId: 'fire_safety', label: 'Colour Coding',           isMandatoryImage: false, sortOrder: 6 },
    ],
  },
  {
    id: 'cabling',
    name: 'Cabling Work',
    icon: 'Cable',
    sortOrder: 9,
    items: [
      { id: 'cab_01', categoryId: 'cabling', label: 'Main Door with Laminate',      isMandatoryImage: false, sortOrder: 1 },
      { id: 'cab_02', categoryId: 'cabling', label: 'Main Door Lock (Dead Lock)',   isMandatoryImage: false, sortOrder: 2 },
      { id: 'cab_03', categoryId: 'cabling', label: 'Main Door Lock (Digital)',     isMandatoryImage: false, sortOrder: 3 },
      { id: 'cab_04', categoryId: 'cabling', label: 'Internal Door',               isMandatoryImage: false, sortOrder: 4 },
      { id: 'cab_05', categoryId: 'cabling', label: 'Internal Door Lock',          isMandatoryImage: false, sortOrder: 5 },
      { id: 'cab_06', categoryId: 'cabling', label: 'Video Door Phone',            isMandatoryImage: false, sortOrder: 6 },
      { id: 'cab_07', categoryId: 'cabling', label: 'Cabling Work',                isMandatoryImage: false, sortOrder: 7 },
      { id: 'cab_08', categoryId: 'cabling', label: 'Indoor Display',              isMandatoryImage: false, sortOrder: 8 },
      { id: 'cab_09', categoryId: 'cabling', label: 'Outdoor Camera',              isMandatoryImage: false, sortOrder: 9 },
    ],
  },
  {
    id: 'wooden_polishing',
    name: 'Wooden Polishing Work',
    icon: 'TreePine',
    sortOrder: 10,
    items: [
      { id: 'wood_01', categoryId: 'wooden_polishing', label: 'Main Door Frame Polish',    isMandatoryImage: false, sortOrder: 1 },
      { id: 'wood_02', categoryId: 'wooden_polishing', label: 'Internal Door Dhar Polish', isMandatoryImage: false, sortOrder: 2 },
    ],
  },
]

export function getAllTemplateItems() {
  return DEFAULT_CHECKLIST_CATEGORIES.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, categoryName: cat.name }))
  )
}

export function getItemMandatoryImage(itemId: string): boolean {
  for (const cat of DEFAULT_CHECKLIST_CATEGORIES) {
    const item = cat.items.find((i) => i.id === itemId)
    if (item) return item.isMandatoryImage
  }
  return false
}
