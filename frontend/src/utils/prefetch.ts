/**
 * prefetch.ts — Full offline data seeder.
 * Runs 2 seconds after login and caches ALL data + images to IndexedDB.
 * Throttled to once per 5 minutes.
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

export async function prefetchAll(user: User): Promise<void> {
  const last = Number(localStorage.getItem(PREFETCH_KEY) || '0')
  if (Date.now() - last < 5 * 60 * 1000) return

  try {
    // 1. Projects
    const { data: projects } = await projectsApi.list()
    await putMany('projects', projects)

    // 2. Towers + Floors
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

    // 3. Flats
    let allFlats: any[] = []
    if (user.role === 'engineer') {
      const { data } = await flatsApi.byEngineer(user.id)
      allFlats = data
    } else {
      allFlats = (
        await Promise.all(
          projects.map((p) => flatsApi.byProject(p.id as string).then((r) => r.data).catch(() => []))
        )
      ).flat()
    }
    await saveFlats(allFlats)

    // 4. Inspections + responses + evidence images
    const flatsToSync = user.role === 'engineer'
      ? allFlats
      : allFlats.filter((f: any) =>
          ['in_progress', 'submitted', 'revision_required', 'desnagging'].includes(f.status)
        )

    await Promise.allSettled(
      flatsToSync.map(async (flat: any) => {
        try {
          const { data: insp } = await inspectionsApi.getByFlat(flat.id)
          await saveInspection(insp)
          for (const r of insp.responses || []) {
            await cacheImages(r.images || [])
          }
        } catch { /* no inspection yet */ }
      })
    )

    // 5. Snags + before/after images
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

    // 6. Notifications
    try {
      const { data: notifs } = await notificationsApi.list()
      await putMany('notifications', notifs)
    } catch { /* ignore */ }

    // 7. Users (for admin assignments)
    if (user.role === 'admin') {
      try {
        const { usersApi: ua } = await import('./api')
        const { data: users } = await ua.list()
        await putMany('users', users)
      } catch { /* ignore */ }
    }

    // 8. QA: review queue + top 20 review details with images
    if (user.role === 'qa' || user.role === 'admin') {
      try {
        const { data: queue } = await reviewsApi.queue()
        localStorage.setItem('review_queue_cache', JSON.stringify(queue))
        await Promise.allSettled(
          (queue as any[]).slice(0, 20).map(async (item: any) => {
            try {
              const { data: detail } = await reviewsApi.get(item.inspectionId)
              localStorage.setItem(`review_detail_${item.inspectionId}`, JSON.stringify(detail))
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
        localStorage.setItem('review_history_cache', JSON.stringify(history))
      } catch { /* ignore */ }
    }

    // 9. Dashboard stats
    if (user.role === 'admin' || user.role === 'viewer') {
      try {
        const { data: report } = await reportsApi.overview()
        localStorage.setItem('reports_overview_cache', JSON.stringify(report))
      } catch { /* ignore */ }
    }

    localStorage.setItem(PREFETCH_KEY, String(Date.now()))
    console.log('[prefetch] ✅ Complete — all data + images cached for offline use')
  } catch (e) {
    console.warn('[prefetch] Partial failure:', e)
  }
}

export function clearPrefetchTimestamp(): void {
  localStorage.removeItem(PREFETCH_KEY)
}
