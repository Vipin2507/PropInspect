import { syncApi } from './api'
import { getPendingChanges, clearPendingChange, saveFlats, saveInspection } from './storage'
import { useSyncStore } from '../store/syncStore'
import type { PendingChange } from '../types'

const LAST_PULL_KEY = 'snagdesk_last_pull'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function fullSync(engineerId?: string): Promise<void> {
  const store = useSyncStore.getState()
  if (store.status === 'syncing') return
  store.setStatus('syncing')

  try {
    await pushChanges()
    await pullChanges(engineerId)
    store.setStatus('idle')
    store.setLastSyncAt(Date.now())
    await refreshPendingCount()
  } catch (e) {
    console.error('Sync failed', e)
    store.setStatus('error')
  }
}

async function pushChanges(): Promise<void> {
  const pending = await getPendingChanges()
  if (!pending.length) return

  const toProcess = [...pending]
  for (const change of toProcess) {
    try {
      await syncApi.push([change])
      await clearPendingChange(change.id)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const retries = change.retries + 1
      if (status && status >= 400 && status < 500) {
        await clearPendingChange(change.id)
      } else if (retries >= 3) {
        await clearPendingChange(change.id)
      } else {
        const backoff = Math.pow(2, retries) * 1000
        await sleep(backoff)
      }
    }
  }
}

async function pullChanges(engineerId?: string): Promise<void> {
  const since = localStorage.getItem(LAST_PULL_KEY) || '1970-01-01T00:00:00.000Z'
  try {
    const { data } = await syncApi.pull(since, engineerId)
    if (data.flats?.length) await saveFlats(data.flats)
    if (data.inspections?.length) {
      for (const insp of data.inspections) await saveInspection(insp)
    }
    localStorage.setItem(LAST_PULL_KEY, new Date().toISOString())
  } catch {
    // Offline — skip pull, cached data stays valid
  }
}

export async function refreshPendingCount(): Promise<void> {
  const pending = await getPendingChanges()
  useSyncStore.getState().setPendingCount(pending.length)
}

export async function queueChange(
  type: PendingChange['type'],
  payload: unknown
): Promise<void> {
  const { addPendingChange } = await import('./storage')
  const change: PendingChange = {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  }
  await addPendingChange(change)
  await refreshPendingCount()
  fullSync().catch(() => {})
}

export function initSyncListeners(engineerId?: string): () => void {
  const onOnline = () => {
    useSyncStore.getState().setOnline(true)
    fullSync(engineerId).catch(console.error)
  }
  const onOffline = () => useSyncStore.getState().setOnline(false)

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  useSyncStore.getState().setOnline(navigator.onLine)

  if (navigator.onLine) fullSync(engineerId).catch(console.error)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
