import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'
import { getDB } from './database'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../constants/checklist'

dotenv.config()

const SEED_USERS = [
  { name: 'Admin User', email: 'admin@snagdesk.in', mobile: '9000000001', role: 'admin', password: 'Admin@123' },
  { name: 'John Engineer', email: 'engineer@snagdesk.in', mobile: '9000000002', role: 'engineer', password: 'Eng@1234' },
  { name: 'QA Checker', email: 'qa@snagdesk.in', mobile: '9000000003', role: 'qa', password: 'QA@12345' },
  { name: 'Management', email: 'viewer@snagdesk.in', mobile: '9000000004', role: 'viewer', password: 'View@123' },
]

export function seedDatabase(): void {
  const db = getDB()
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  if (userCount.c > 0) return

  const userIds: Record<string, string> = {}
  for (const u of SEED_USERS) {
    const id = uuidv4()
    userIds[u.role] = id
    const hash = bcrypt.hashSync(u.password, 10)
    db.prepare(
      `INSERT INTO users (id, name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, u.name, u.email, u.mobile, hash, u.role)
  }

  const adminId = userIds.admin
  const engineerId = userIds.engineer
  const qaId = userIds.qa

  const templateId = uuidv4()
  const sections = DEFAULT_CHECKLIST_CATEGORIES.map((cat) => ({
    id: cat.id,
    templateId,
    name: cat.name,
    icon: cat.icon,
    sortOrder: cat.sortOrder,
    items: cat.items,
  }))
  db.prepare(
    `INSERT INTO checklist_templates (id, name, sections, is_default, created_by) VALUES (?, ?, ?, 1, ?)`
  ).run(templateId, 'Default Snagging Checklist', JSON.stringify(sections), adminId)

  const projectId = uuidv4()
  db.prepare(
    `INSERT INTO projects (id, name, location, developer_name, created_by) VALUES (?, ?, ?, ?, ?)`
  ).run(projectId, 'Green Heights', 'Bhopal, MP', 'Cravingcode Developers', adminId)

  function createTower(
    name: string,
    totalFloors: number,
    unitsPerFloor: number,
    unitPrefix: string,
    startNumber: number
  ) {
    const towerId = uuidv4()
    db.prepare(
      `INSERT INTO towers (id, project_id, name, total_floors, units_per_floor, unit_prefix, start_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(towerId, projectId, name, totalFloors, unitsPerFloor, unitPrefix, startNumber)

    const floors: string[] = []
    const flats: string[] = []

    for (let f = 1; f <= totalFloors; f++) {
      const floorId = uuidv4()
      const label = f === 0 ? 'Ground Floor' : `Floor ${f}`
      db.prepare(
        `INSERT INTO floors (id, tower_id, project_id, floor_number, label) VALUES (?, ?, ?, ?, ?)`
      ).run(floorId, towerId, projectId, f, label)
      floors.push(floorId)

      for (let u = 0; u < unitsPerFloor; u++) {
        const flatId = uuidv4()
        const flatNumber = `${unitPrefix}${startNumber + (f - 1) * unitsPerFloor + u}`
        db.prepare(
          `INSERT INTO flats (id, tower_id, project_id, floor_id, flat_number, floor) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(flatId, towerId, projectId, floorId, flatNumber, f)
        flats.push(flatId)
      }
    }
    return { towerId, flats }
  }

  const towerA = createTower('Tower A', 3, 5, 'A-', 101)
  createTower('Tower B', 2, 4, 'B-', 201)

  const flatRows = db
    .prepare(`SELECT id, flat_number FROM flats WHERE tower_id = ? ORDER BY flat_number LIMIT 3`)
    .all(towerA.towerId) as { id: string; flat_number: string }[]

  for (const flat of flatRows) {
    db.prepare(
      `INSERT INTO assignments (id, flat_id, engineer_id, qa_id, assigned_by) VALUES (?, ?, ?, ?, ?)`
    ).run(uuidv4(), flat.id, engineerId, qaId, adminId)
  }

  console.log(`
==========================================
SNAGDESK SEED CREDENTIALS
Admin:    admin@snagdesk.in    / Admin@123
Engineer: engineer@snagdesk.in / Eng@1234
QA:       qa@snagdesk.in       / QA@12345
Viewer:   viewer@snagdesk.in   / View@123
==========================================
`)
}

if (require.main === module) {
  seedDatabase()
}
