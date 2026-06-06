import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'snagdesk'
const DB_VERSION = 3  // bumped to add imageBlobs store

interface SnagDeskDB extends DBSchema {
  users: { key: string; value: Record<string, unknown> }
  projects: { key: string; value: Record<string, unknown> }
  towers: { key: string; value: Record<string, unknown>; indexes: { 'by-project': string } }
  floors: { key: string; value: Record<string, unknown>; indexes: { 'by-tower': string } }
  flats: {
    key: string
    value: Record<string, unknown>
    indexes: { 'by-tower': string; 'by-engineer': string; 'by-status': string }
  }
  assignments: {
    key: string
    value: Record<string, unknown>
    indexes: { 'by-flat': string; 'by-engineer': string }
  }
  templates: { key: string; value: Record<string, unknown> }
  inspections: {
    key: string
    value: Record<string, unknown>
    indexes: { 'by-flat': string; 'by-engineer': string }
  }
  responses: { key: string; value: Record<string, unknown>; indexes: { 'by-inspection': string } }
  snags: {
    key: string
    value: Record<string, unknown>
    indexes: { 'by-inspection': string; 'by-flat': string }
  }
  images: {
    key: string
    value: Record<string, unknown>
    indexes: { 'by-inspection': string; 'by-response': string }
  }
  reviews: { key: string; value: Record<string, unknown>; indexes: { 'by-inspection': string } }
  notifications: { key: string; value: Record<string, unknown>; indexes: { 'by-user': string } }
  pendingSync: { key: string; value: Record<string, unknown> }
  // Stores base64 data URIs keyed by the server URL path (e.g. /uploads/xxx/yyy.jpg)
  imageBlobs: { key: string; value: { url: string; base64: string } }
}

let dbPromise: Promise<IDBPDatabase<SnagDeskDB>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SnagDeskDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('towers')) {
          const s = db.createObjectStore('towers', { keyPath: 'id' })
          s.createIndex('by-project', 'projectId')
        }
        if (!db.objectStoreNames.contains('floors')) {
          const s = db.createObjectStore('floors', { keyPath: 'id' })
          s.createIndex('by-tower', 'towerId')
        }
        if (!db.objectStoreNames.contains('flats')) {
          const s = db.createObjectStore('flats', { keyPath: 'id' })
          s.createIndex('by-tower', 'towerId')
          s.createIndex('by-engineer', 'engineerId')
          s.createIndex('by-status', 'status')
        }
        if (!db.objectStoreNames.contains('assignments')) {
          const s = db.createObjectStore('assignments', { keyPath: 'id' })
          s.createIndex('by-flat', 'flatId')
          s.createIndex('by-engineer', 'engineerId')
        }
        if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('inspections')) {
          const s = db.createObjectStore('inspections', { keyPath: 'id' })
          s.createIndex('by-flat', 'flatId')
          s.createIndex('by-engineer', 'engineerId')
        }
        if (!db.objectStoreNames.contains('responses')) {
          const s = db.createObjectStore('responses', { keyPath: 'id' })
          s.createIndex('by-inspection', 'inspectionId')
        }
        if (!db.objectStoreNames.contains('snags')) {
          const s = db.createObjectStore('snags', { keyPath: 'id' })
          s.createIndex('by-inspection', 'inspectionId')
          s.createIndex('by-flat', 'flatId')
        }
        if (!db.objectStoreNames.contains('images')) {
          const s = db.createObjectStore('images', { keyPath: 'id' })
          s.createIndex('by-inspection', 'inspectionId')
          s.createIndex('by-response', 'responseId')
        }
        if (!db.objectStoreNames.contains('reviews')) {
          const s = db.createObjectStore('reviews', { keyPath: 'id' })
          s.createIndex('by-inspection', 'inspectionId')
        }
        if (!db.objectStoreNames.contains('notifications')) {
          const s = db.createObjectStore('notifications', { keyPath: 'id' })
          s.createIndex('by-user', 'userId')
        }
        if (!db.objectStoreNames.contains('pendingSync')) {
          db.createObjectStore('pendingSync', { keyPath: 'id' })
        }
        // v3: image blob cache keyed by URL path
        if (!db.objectStoreNames.contains('imageBlobs')) {
          db.createObjectStore('imageBlobs', { keyPath: 'url' })
        }
      },
    })
  }
  return dbPromise
}
