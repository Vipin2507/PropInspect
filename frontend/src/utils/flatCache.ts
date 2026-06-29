import type { Flat } from '../types'
import { useFlatProgressStore } from '../store/flatProgressStore'
import { getFlatById, saveSingleFlat } from './storage'
import { patchFlatsMemCache } from '../hooks/useFlats'

/** Instant UI/list update — no IndexedDB. */
export function patchFlatCompletionLive(
  flatId: string,
  completionPct: number,
  extra?: Partial<Flat>
): void {
  useFlatProgressStore.getState().setProgress(flatId, completionPct)
  patchFlatsMemCache(flatId, { completionPct, ...extra })
}

/** Persist flat completion to IndexedDB in the background. */
export async function persistFlatCompletion(
  flatId: string,
  completionPct: number,
  extra?: Partial<Flat>
): Promise<void> {
  try {
    const flat = await getFlatById(flatId)
    if (flat) {
      await saveSingleFlat({ ...flat, completionPct, ...extra })
    }
  } catch { /* non-fatal */ }
}

/** Live update + optional background IndexedDB persist. */
export function patchFlatCompletion(
  flatId: string,
  completionPct: number,
  extra?: Partial<Flat>
): void {
  patchFlatCompletionLive(flatId, completionPct, extra)
  void persistFlatCompletion(flatId, completionPct, extra)
}
