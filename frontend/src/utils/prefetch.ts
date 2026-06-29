/**
 * prefetch.ts — Full offline data seeder.
 * Runs immediately after login and caches data to IndexedDB / localStorage.
 */

import {
  projectsApi, towersApi, flatsApi, floorsApi, inspectionsApi,
  snagsApi, notificationsApi, reviewsApi, reportsApi,
} from './api'
import { saveFlats, saveInspection } from './storage'
import { getDb } from './db'
import { cacheImage } from './imageCache'
import type { User, SnagImage } from '../types'

const PREFETCH_KEY = 'snagdesk_last_prefetch'
const CHECKER_FLATS_KEY = 'checker_flats_cache'
const REVIEW_QUEUE_KEY = 'review_queue_cache'
const REVIEW_HISTORY_KEY = 'review_history_cache'

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

    const allFlats: any[] = (
      await Promise.all(
        projects.map((p) => flatsApi.byProject(p.id as string).then((r) => r.data).catch(() => []))
      )
    ).flat()
    await saveFlats(allFlats)

    // Cache inspections for every flat (not only in-progress) so deep-links work
    await Promise.allSettled(
      allFlats.map(async (flat: any) => {
        try {
          const { data: insp } = await inspectionsApi.getByFlat(flat.id)
          await saveInspection(insp)
          for (const r of insp.responses || []) {
            await cacheImages(r.images || [])
          }
        } catch { /* no inspection yet */ }
      })
    )

    await Promise.allSettled(
      projects.map(async (p) => {
        try {
          const { data: snags } = await snagsApi.list({ projectId: p.id as string })
          await putMany('snags', snags)
          for (const s of snags) {
            await cacheImages(s.beforeImages || [])
            await cacheImages(s.afterImages || [])
          }
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

        await Promise.allSettled(
          (checkerFlats as any[]).map(async (flat: any) => {
            const inspectionId = flat.inspectionId || flat.inspection?.id
            if (!inspectionId) return
            try {
              const { data: detail } = await reviewsApi.get(inspectionId)
              localStorage.setItem(`review_detail_${inspectionId}`, JSON.stringify(detail))
              const insp = (detail as any).inspection
              for (const r of insp?.responses || []) {
                await cacheImages(r.images || [])
              }
            } catch { /* ignore */ }
          })
        )
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
