import { useEffect, useState, useCallback, useRef } from 'react'
import { flatsApi, projectsApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { getDb } from '../utils/db'
import type { Flat } from '../types'

// ── Sort helper ───────────────────────────────────────────────────────────────
// Order: tower name → floor number → flat number (natural numeric sort)
// e.g. A-101, A-102, A-201, B-101 — not A-101, A-201, A-102
function naturalNum(s: string): number {
  const m = s.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

export function sortFlats(flats: Flat[]): Flat[] {
  return [...flats].sort((a, b) => {
    // 1. Tower name alphabetically
    const towerCmp = (a.towerName ?? '').localeCompare(b.towerName ?? '', undefined, { numeric: true })
    if (towerCmp !== 0) return towerCmp
    // 2. Floor number numerically
    const floorCmp = (a.floor ?? 0) - (b.floor ?? 0)
    if (floorCmp !== 0) return floorCmp
    // 3. Flat number — natural numeric (A-101 before A-102)
    return naturalNum(a.flatNumber) - naturalNum(b.flatNumber)
  })
}

// ── Module-level memory cache ─────────────────────────────────────────────────
// Survives component remounts — eliminates the blank flash between navigation.
// Keyed by "{userId}:{projectId|all}"
const memCache: Map<string, Flat[]> = new Map()

function memKey(userId: string, projectId?: string) {
  return `${userId}:${projectId ?? 'all'}`
}

async function readDb(userId: string, role: string): Promise<Flat[]> {
  try {
    const db = await getDb()
    // All roles read all locally cached flats; role-based filtering is done server-side
    void userId; void role
    return (await db.getAll('flats')) as unknown as Flat[]
  } catch { return [] }
}

async function writeDb(flats: Flat[]): Promise<void> {
  try {
    const db = await getDb()
    const tx = db.transaction('flats', 'readwrite')
    for (const f of flats) await tx.store.put(f as unknown as Record<string, unknown>)
    await tx.done
  } catch { /* non-fatal */ }
}

export function useFlats(projectId?: string) {
  const user = useAuthStore((s) => s.user)

  // Initialise from memory cache synchronously — ZERO blank flash on remount
  const key = user ? memKey(user.id, projectId) : ''
  const initial = key ? (memCache.get(key) ?? []) : []

  const [flats, setFlats] = useState<Flat[]>(initial)
  const [loading, setLoading] = useState(initial.length === 0)

  // Prevent stale setState after unmount
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const refresh = useCallback(async () => {
    if (!user) return

    // Phase 1: IndexedDB (fast, persistent across app restarts)
    if (memCache.get(key)?.length === 0 || !memCache.has(key)) {
      const dbFlats = await readDb(user.id, user.role)
      if (dbFlats.length > 0) {
        const filtered = sortFlats(projectId ? dbFlats.filter((f) => f.projectId === projectId) : dbFlats)
        memCache.set(key, filtered)
        if (mounted.current) { setFlats(filtered); setLoading(false) }
      }
    }

    // Phase 2: Network (always refresh silently)
    try {
      let fresh: Flat[] = []
      if (projectId) {
        const { data } = await flatsApi.byProject(projectId)
        fresh = data
      } else {
        // All roles (engineer, qa, admin) fetch flats by project — no assignment filter.
        // The backend enforces role-based visibility (QA only sees submitted+ flats).
        const { data: projects } = await projectsApi.list()
        const results = await Promise.all(
          projects.map((p) => flatsApi.byProject(p.id).then((r) => r.data))
        )
        fresh = results.flat()
      }
      await writeDb(fresh)
      const sorted = sortFlats(fresh)
      memCache.set(key, sorted)
      if (mounted.current) setFlats(sorted)
    } catch {
      // Network failed — memory/db cache already shown
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [user, projectId, key])

  useEffect(() => { refresh() }, [refresh])

  return { flats, loading, refresh }
}
