import { getDb } from './db'
import type { Inspection, Flat, PendingChange, InspectionResponse } from '../types'

export async function putStore<T extends Record<string, unknown>>(store: keyof Awaited<ReturnType<typeof getDb>>['objectStoreNames'] extends never ? never : string, item: T) {
  const db = await getDb()
  await db.put(store as 'flats', item)
}

export async function getInspection(flatId: string): Promise<Inspection | undefined> {
  const db = await getDb()
  const all = await db.getAllFromIndex('inspections', 'by-flat', flatId)
  return all[0] as unknown as Inspection | undefined
}

export async function saveInspection(inspection: Inspection): Promise<void> {
  const db = await getDb()
  await db.put('inspections', inspection as unknown as Record<string, unknown>)
  for (const r of inspection.responses) {
    await db.put('responses', r as unknown as Record<string, unknown>)
  }
}

export async function getFlatsByEngineer(engineerId: string): Promise<Flat[]> {
  const db = await getDb()
  return (await db.getAllFromIndex('flats', 'by-engineer', engineerId)) as unknown as Flat[]
}

export async function saveFlats(flats: Flat[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('flats', 'readwrite')
  for (const f of flats) await tx.store.put(f as unknown as Record<string, unknown>)
  await tx.done
}

export async function addPendingChange(change: PendingChange): Promise<void> {
  const db = await getDb()
  await db.put('pendingSync', change as unknown as Record<string, unknown>)
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const db = await getDb()
  return (await db.getAll('pendingSync')) as unknown as PendingChange[]
}

export async function clearPendingChange(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('pendingSync', id)
}

export async function updateResponse(response: InspectionResponse): Promise<void> {
  const db = await getDb()
  await db.put('responses', response as unknown as Record<string, unknown>)
}

export async function getResponses(inspectionId: string): Promise<InspectionResponse[]> {
  const db = await getDb()
  return (await db.getAllFromIndex('responses', 'by-inspection', inspectionId)) as unknown as InspectionResponse[]
}

export async function saveImage(image: Record<string, unknown>): Promise<void> {
  const db = await getDb()
  await db.put('images', image)
}

export async function getImagesForResponse(responseId: string) {
  const db = await getDb()
  return db.getAllFromIndex('images', 'by-response', responseId)
}

export async function getFlatById(flatId: string): Promise<Flat | undefined> {
  const db = await getDb()
  return (await db.get('flats', flatId)) as unknown as Flat | undefined
}

export async function saveSingleFlat(flat: Flat): Promise<void> {
  const db = await getDb()
  await db.put('flats', flat as unknown as Record<string, unknown>)
}
