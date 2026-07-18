/**
 * prefetch.ts — Offline data seeder.
 * Caches structure + ALL flat inspections so any flat works offline after login.
 */

import {
  projectsApi, towersApi, flatsApi, floorsApi, inspectionsApi,
  snagsApi, notificationsApi, reviewsApi, reportsApi,
  engineerFeedbackApi, qaChangesApi, templatesApi,
} from './api'
import { saveFlats, saveInspection, saveTemplates, getInspection } from './storage'
import { getDb } from './db'
import { cacheInspectionImages, cacheSnagImages, cacheReviewDetailImages } from './imageCache'
import { writeLsCache } from './offlineCache'
import type { Flat, Inspection, User } from '../types'

const PREFETCH_KEY = 'snagdesk_last_prefetch'
const CHECKER_FLATS_KEY = 'checker_flats_cache'
const REVIEW_QUEUE_KEY = 'review_queue_cache'
const REVIEW_HISTORY_KEY = 'review_history_cache'

/** Background inspection fetch — keep gentle to avoid flooding the API. */
const PREFETCH_CONCURRENCY = 4
const PREFETCH_DELAY_MS = 80

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

const SKIP_INSPECTION_STATUSES = new Set(['handed_over'])

function flatPriority(a: Flat, b: Flat): number {
  const rank = (s: string) =>
    s === 'in_progress' ? 0
      : s === 'revision_required' ? 1
      : s === 'submitted' ? 2
      : s === 'not_started' ? 3
      : 4
  const diff = rank(a.status) - rank(b.status)
  if (diff !== 0) return diff
  return (b.completionPct ?? 0) - (a.completionPct ?? 0)
}

/**
 * Every flat that should be usable offline.
 * Prefetch existing / in-progress work for all roles except QA (QA uses review details).
 * Skip not_started flats with no inspection yet — opening them online creates the draft.
 */
function pickInspectionFlats(flats: Flat[], user: User): Flat[] {
  if (user.role === 'qa') return []

  return flats
    .filter((f) => {
      if (SKIP_INSPECTION_STATUSES.has(f.status)) return false
      // Avoid mass-creating draft inspections for untouched flats
      if (f.status === 'not_started' && !f.inspectionId && !f.inspection?.id) return false
      return true
    })
    .sort(flatPriority)
}

/** Prefetch inspections for a list of flats (skips ones already in IndexedDB unless force). */
export async function prefetchInspections(
  flats: Flat[],
  opts?: { cacheImages?: boolean; force?: boolean }
): Promise<void> {
  const cacheImages = opts?.cacheImages ?? true
  const force = opts?.force ?? false

  await mapPool(flats, async (flat) => {
    try {
      if (!force) {
        const existing = await getInspection(flat.id).catch(() => undefined)
        if (existing) return
      }
      const { data: insp } = await inspectionsApi.getByFlat(flat.id)
      await saveInspection(insp)
      if (cacheImages) cacheInspectionImages(insp)
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

    // Structure is ready — mark timestamp early so UI can proceed; inspections continue below
    localStorage.setItem(PREFETCH_KEY, String(Date.now()))

    const priorityFlats = pickInspectionFlats(allFlats, user)
    // Cache ALL inspections (not capped) so every flat works offline after login
    await prefetchInspections(priorityFlats, {
      cacheImages: user.role === 'engineer' || user.role === 'admin',
      force: opts?.force,
    })
    console.log(`[prefetch] Inspections cached for ${priorityFlats.length} flats`)

    await Promise.allSettled(
      projects.map(async (p) => {
        try {
          const { data: snags } = await snagsApi.list({ projectId: p.id as string })
          await putMany('snags', snags)
          for (const s of snags) cacheSnagImages(s)
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

    if (user.role === 'engineer' || user.role === 'admin') {
      try {
        const { data } = await engineerFeedbackApi.list({ unseenOnly: true })
        writeLsCache('engineer_feedback:unseenOnly=true', data.groups)
        writeLsCache('engineer_feedback:unseenOnly=true:meta', { totalUnseen: data.totalUnseen })
        writeLsCache('engineer_feedback_count', { unseen: data.totalUnseen })
      } catch { /* ignore */ }
    }

    if (user.role === 'qa' || user.role === 'admin') {
      try {
        const { data: queue } = await reviewsApi.queue()
        writeLsCache(REVIEW_QUEUE_KEY, queue)
      } catch { /* ignore */ }

      try {
        const { data: checkerFlats } = await flatsApi.checkerList({})
        writeLsCache(CHECKER_FLATS_KEY, checkerFlats)

        // Cache ALL reviewable flats for offline — not just 15
        const submittedForReview = (checkerFlats as Flat[]).filter((f) =>
          ['submitted', 'revision_required', 'approved', 'rejected', 'desnagging'].includes(f.status)
        )

        await mapPool(submittedForReview, async (flat) => {
          const inspectionId = flat.inspectionId || flat.inspection?.id
          if (!inspectionId) return
          try {
            const { data: detail } = await reviewsApi.get(inspectionId)
            writeLsCache(`review_detail_${inspectionId}`, detail)
            cacheReviewDetailImages(detail as { inspection: Inspection })
            if (detail.inspection) await saveInspection(detail.inspection)
          } catch { /* ignore */ }
        })
        console.log(`[prefetch] Review details cached for ${submittedForReview.length} flats`)
      } catch { /* ignore */ }

      try {
        const { data: history } = await reviewsApi.history()
        writeLsCache(REVIEW_HISTORY_KEY, history)
      } catch { /* ignore */ }

      try {
        const { data: changes } = await qaChangesApi.list({ unreviewedOnly: true })
        writeLsCache('qa_changes:unreviewedOnly=true', changes.groups)
        writeLsCache('qa_changes:unreviewedOnly=true:meta', { totalUnreviewed: changes.totalUnreviewed })
        writeLsCache('qa_changes_count', { unreviewed: changes.totalUnreviewed })
      } catch { /* ignore */ }
    }

    if (user.role === 'admin') {
      try {
        const { data: activity } = await reportsApi.activity(200)
        writeLsCache('activity_log:limit=200', activity)
      } catch { /* ignore */ }

      try {
        const { data: templates } = await templatesApi.list()
        await saveTemplates(templates as unknown as Record<string, unknown>[])
      } catch { /* ignore */ }

      try {
        const { data: flatsReport } = await reportsApi.flats({})
        writeLsCache('reports_flats_cache', flatsReport)
      } catch { /* ignore */ }
    }

    if (user.role === 'admin' || user.role === 'viewer') {
      try {
        const { data: report } = await reportsApi.overview()
        writeLsCache('reports_overview_cache', report)
      } catch { /* ignore */ }
    }

    console.log('[prefetch] Structure ready — inspections caching in background')
  } catch (e) {
    console.warn('[prefetch] Partial failure:', e)
    throw e
  }
}

export function clearPrefetchTimestamp(): void {
  localStorage.removeItem(PREFETCH_KEY)
}
