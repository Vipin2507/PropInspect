/**
 * prefetch.ts — Offline data seeder (lightweight).
 * Caches structure + priority flats only — avoids flooding the API on login.
 */

import {
  projectsApi, towersApi, flatsApi, floorsApi, inspectionsApi,
  snagsApi, notificationsApi, reviewsApi, reportsApi,
} from './api'
import { saveFlats, saveInspection } from './storage'
import { getDb } from './db'
import { cacheImage } from './imageCache'
import type { Flat, SnagImage, User } from '../types'

const PREFETCH_KEY = 'snagdesk_last_prefetch'
const CHECKER_FLATS_KEY = 'checker_flats_cache'
const REVIEW_QUEUE_KEY = 'review_queue_cache'
const REVIEW_HISTORY_KEY = 'review_history_cache'

/** Max per-flat inspection fetches on login — rest load on demand. */
const MAX_INSPECTION_PREFETCH = 15
const PREFETCH_CONCURRENCY = 2
const PREFETCH_DELAY_MS = 200

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function putMany(store: string, items: unknown[]): Promise<void> {
  if (!items.length) return
  try {
    const db = await getDb()
    const tx = db.transaction(store as 'flats', 'readwrite')
    for (const item of items) await tx.store.put(item as Record<string, unknown>)
    await tx.done
  } catch { /* non-fatal */ }
}

async function cacheImages(images: SnagImage[]): Promise<void> {
  for (const img of images) {
    await cacheImage(img.thumbnailUrl)
    await cacheImage(img.url)
  }
}

/** Run async work with limited concurrency and a small delay between items. */
async function mapPool<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency = PREFETCH_CONCURRENCY
): Promise<void> {
  if (!items.length) return
  let index = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++
      await fn(items[i])
      if (PREFETCH_DELAY_MS > 0) await sleep(PREFETCH_DELAY_MS)
    }
  })
  await Promise.all(workers)
}

const ACTIVE_STATUSES = new Set(['in_progress', 'revision_required', 'submitted', 'not_started'])

function flatPriority(a: Flat, b: Flat): number {
  const rank = (s: string) =>
    s === 'in_progress' ? 0 : s === 'revision_required' ? 1 : s === 'submitted' ? 2 : 3
  const diff = rank(a.status) - rank(b.status)
  if (diff !== 0) return diff
  return (b.completionPct ?? 0) - (a.completionPct ?? 0)
}

function pickInspectionFlats(flats: Flat[], user: User): Flat[] {
  if (user.role === 'qa') {
    // QA loads inspections on demand from Changes Log / All Flats
    return []
  }

  return flats
    .filter((f) => ACTIVE_STATUSES.has(f.status))
    .sort(flatPriority)
    .slice(0, MAX_INSPECTION_PREFETCH)
}

async function prefetchInspections(flats: Flat[], cacheImagesForInspections: boolean): Promise<void> {
  await mapPool(flats, async (flat) => {
    try {
      const { data: insp } = await inspectionsApi.getByFlat(flat.id)
      await saveInspection(insp)
      if (!cacheImagesForInspections) return
      for (const r of insp.responses || []) {
        await cacheImages(r.images || [])
      }
    } catch { /* no inspection yet or rate limited */ }
  })
}

export async function prefetchAll(
  user: User,
  opts?: { force?: boolean }
): Promise<void> {
  const last = Number(localStorage.getItem(PREFETCH_KEY) || '0')
  if (!opts?.force && Date.now() - last < 5 * 60 * 1000) return

  try {
    const { data: projects } = await projectsApi.list()
    await putMany('projects', projects)

    const allTowers = (
      await Promise.all(
        projects.map((p) => towersApi.list(p.id as string).then((r) => r.data).catch(() => []))
      )
    ).flat()
    await putMany('towers', allTowers)

    const allFloors = (
      await Promise.all(
        allTowers.map((t) => floorsApi.list(t.id as string).then((r) => r.data).catch(() => []))
      )
    ).flat()
    await putMany('floors', allFloors)

    const allFlats: Flat[] = (
      await Promise.all(
        projects.map((p) => flatsApi.byProject(p.id as string).then((r) => r.data).catch(() => []))
      )
    ).flat()
    await saveFlats(allFlats)

    const priorityFlats = pickInspectionFlats(allFlats, user)
    await prefetchInspections(priorityFlats, user.role === 'engineer')

    await Promise.allSettled(
      projects.map(async (p) => {
        try {
          const { data: snags } = await snagsApi.list({ projectId: p.id as string })
          await putMany('snags', snags)
        } catch { /* ignore */ }
      })
    )

    try {
      const { data: notifs } = await notificationsApi.list()
      await putMany('notifications', notifs)
    } catch { /* ignore */ }

    if (user.role === 'admin') {
      try {
        const { usersApi: ua } = await import('./api')
        const { data: users } = await ua.list()
        await putMany('users', users)
      } catch { /* ignore */ }
    }

    if (user.role === 'qa' || user.role === 'admin') {
      try {
        const { data: queue } = await reviewsApi.queue()
        localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue))
      } catch { /* ignore */ }

      try {
        const { data: checkerFlats } = await flatsApi.checkerList({})
        localStorage.setItem(CHECKER_FLATS_KEY, JSON.stringify(checkerFlats))

        const submittedForReview = (checkerFlats as Flat[])
          .filter((f) => f.status === 'submitted')
          .slice(0, MAX_INSPECTION_PREFETCH)

        await mapPool(submittedForReview, async (flat) => {
          const inspectionId = flat.inspectionId || flat.inspection?.id
          if (!inspectionId) return
          try {
            const { data: detail } = await reviewsApi.get(inspectionId)
            localStorage.setItem(`review_detail_${inspectionId}`, JSON.stringify(detail))
          } catch { /* ignore */ }
        })
      } catch { /* ignore */ }

      try {
        const { data: history } = await reviewsApi.history()
        localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(history))
      } catch { /* ignore */ }
    }

    if (user.role === 'admin' || user.role === 'viewer') {
      try {
        const { data: report } = await reportsApi.overview()
        localStorage.setItem('reports_overview_cache', JSON.stringify(report))
      } catch { /* ignore */ }
    }

    localStorage.setItem(PREFETCH_KEY, String(Date.now()))
    console.log('[prefetch] Complete — offline cache ready')
  } catch (e) {
    console.warn('[prefetch] Partial failure:', e)
    throw e
  }
}

export function clearPrefetchTimestamp(): void {
  localStorage.removeItem(PREFETCH_KEY)
}
