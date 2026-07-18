import { useEffect, useState, useCallback, useRef } from 'react'
import { inspectionsApi, responsesApi } from '../utils/api'
import { saveInspection, saveInspectionDelta, getInspection } from '../utils/storage'
import { queueChange } from '../utils/sync'
import { useInspectionUiStore } from '../store/inspectionUiStore'
import { applyCompletionToInspection } from '../utils/completion'
import { cacheInspectionImages } from '../utils/imageCache'
import { TOTAL_ITEMS } from '../constants/checklist'
import { patchFlatCompletionLive, persistFlatCompletion } from '../utils/flatCache'
import type { Inspection, InspectionResponse, Flat } from '../types'
import toast from 'react-hot-toast'

const REMARKS_DEBOUNCE_MS = 600

function mergeInspections(local: Inspection, remote: Inspection): Inspection {
  const byItem = new Map(remote.responses.map((r) => [r.itemId, r]))
  for (const lr of local.responses) {
    const rr = byItem.get(lr.itemId)
    if (!rr || new Date(lr.updatedAt).getTime() > new Date(rr.updatedAt).getTime()) {
      byItem.set(lr.itemId, lr)
    }
  }
  const responses = remote.responses.map((r) => byItem.get(r.itemId) ?? r)
  const localNewer =
    new Date(local.lastUpdated).getTime() > new Date(remote.lastUpdated).getTime()
  return {
    ...remote,
    responses,
    lastUpdated: localNewer ? local.lastUpdated : remote.lastUpdated,
  }
}

function hasLocalNewerResponses(local: Inspection, remote: Inspection): boolean {
  const remoteByItem = new Map(remote.responses.map((r) => [r.itemId, r]))
  return local.responses.some((lr) => {
    const rr = remoteByItem.get(lr.itemId)
    return !rr || new Date(lr.updatedAt).getTime() > new Date(rr.updatedAt).getTime()
  })
}

export function useInspection(flatId: string | undefined) {
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const inspectionRef = useRef<Inspection | null>(null)
  inspectionRef.current = inspection

  const remarkTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const pendingPersist = useRef<Map<string, () => Promise<void>>>(new Map())
  const inFlightSaves = useRef(0)
  const loadGen = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    setInspection(null)
    setLoading(true)
  }, [flatId])

  const setGlobalSaveState = useInspectionUiStore((s) => s.setSaveState)

  const beginSave = useCallback(() => {
    inFlightSaves.current += 1
    if (inFlightSaves.current === 1) {
      setSaveState('saving')
      setGlobalSaveState('saving')
    }
  }, [setGlobalSaveState])

  const endSave = useCallback(() => {
    inFlightSaves.current = Math.max(0, inFlightSaves.current - 1)
    if (inFlightSaves.current === 0) {
      setSaveState('saved')
      setGlobalSaveState('saved')
      setTimeout(() => {
        if (inFlightSaves.current === 0) {
          setSaveState('idle')
          setGlobalSaveState('idle')
        }
      }, 1500)
    }
  }, [setGlobalSaveState])

  const markSaving = beginSave
  const markSaved = endSave

  const cachePersistAfterSave = useCallback(
    (insp: Inspection, changed: InspectionResponse) => {
      void saveInspectionDelta(insp, changed).catch(() => {})
      if (insp.flatId && insp.completionPct !== undefined) {
        patchFlatCompletionLive(insp.flatId, insp.completionPct, {
          status: 'in_progress' as Flat['status'],
        })
        void persistFlatCompletion(insp.flatId, insp.completionPct, {
          status: 'in_progress' as Flat['status'],
        })
      }
    },
    []
  )

  const persistResponseToServer = useCallback(
    async (response: InspectionResponse, opts?: { trackUi?: boolean }) => {
      if (response.status === 'fail' && !response.remarks?.trim()) return

      const trackUi = opts?.trackUi ?? true
      if (trackUi) markSaving()

      const responseId = response.id
      try {
        const { data } = await responsesApi.updateStatus(responseId, {
          status: response.status,
          remarks: response.remarks || undefined,
        })
        const server = data as InspectionResponse & { completionPct?: number; pendingCount?: number }

        let savedRow: InspectionResponse | null = null
        setInspection((prev) => {
          if (!prev) return prev
          const responses = prev.responses.map((r) => {
            if (r.id !== responseId) return r
            savedRow = { ...r, ...server }
            return savedRow
          })
          return applyCompletionToInspection(
            {
              ...prev,
              completionPct: server.completionPct ?? prev.completionPct,
              pendingCount: server.pendingCount ?? prev.pendingCount,
              completedCount:
                server.pendingCount !== undefined
                  ? (prev.totalItems ?? TOTAL_ITEMS) - server.pendingCount
                  : prev.completedCount,
            },
            responses
          )
        })

        if (trackUi) markSaved()

        const next = inspectionRef.current
        if (next && savedRow) {
          cachePersistAfterSave(next, savedRow)
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
        const status = axiosErr?.response?.status
        const serverMsg = axiosErr?.response?.data?.error
        const isNetwork = !status || status >= 500

        if (!isNetwork) {
          if (trackUi) {
            inFlightSaves.current = Math.max(0, inFlightSaves.current - 1)
            if (inFlightSaves.current === 0) {
              setSaveState('idle')
              setGlobalSaveState('idle')
            }
          }
          toast.error(serverMsg || 'Could not save this task')
          return
        }

        const current = inspectionRef.current
        if (!current) {
          if (trackUi) inFlightSaves.current = Math.max(0, inFlightSaves.current - 1)
          return
        }

        await queueChange('save_inspection', {
          inspectionId: current.id,
          responses: [{
            id: response.id,
            itemId: response.itemId,
            categoryId: response.categoryId,
            status: response.status,
            remarks: response.remarks,
          }],
        })
        if (trackUi) markSaved()
      }
    },
    [markSaving, markSaved, cachePersistAfterSave, setGlobalSaveState]
  )

  const load = useCallback(async () => {
    if (!flatId) return
    const gen = ++loadGen.current

    const hydrateFromCache = async (): Promise<Inspection | undefined> => {
      const cached = await getInspection(flatId).catch(() => undefined)
      if (!cached || gen !== loadGen.current || !mounted.current) return cached
      const withProgress = applyCompletionToInspection(cached)
      setInspection(withProgress)
      setLoading(false)
      return withProgress
    }

    await hydrateFromCache()

    // Prefetch may populate IndexedDB while our network request is queued
    const pollCache = setInterval(() => {
      if (gen !== loadGen.current || inspectionRef.current) {
        clearInterval(pollCache)
        return
      }
      void hydrateFromCache()
    }, 400)

    try {
      const { data } = await inspectionsApi.getByFlat(flatId)
      if (gen !== loadGen.current || !mounted.current) return

      const base = inspectionRef.current
      const merged = base
        ? applyCompletionToInspection(mergeInspections(base, data))
        : applyCompletionToInspection(data)

      setInspection(merged)

      void saveInspection(merged).catch(() => {})
      cacheInspectionImages(merged)
      if (merged.flatId && merged.completionPct !== undefined) {
        patchFlatCompletionLive(merged.flatId, merged.completionPct)
        void persistFlatCompletion(merged.flatId, merged.completionPct)
      }

      const cached = await getInspection(flatId).catch(() => undefined)
      const hadLocalEdits =
        cached &&
        hasLocalNewerResponses(cached, data as Inspection)
      if (hadLocalEdits) {
        const slim = merged.responses.map(({ id, itemId, categoryId, status, remarks }) => ({
          id, itemId, categoryId, status, remarks,
        }))
        inspectionsApi.save(merged.id, slim as any).catch(() => {
          queueChange('save_inspection', { inspectionId: merged.id, responses: slim })
        })
      }
    } catch {
      if (gen === loadGen.current && mounted.current && !inspectionRef.current) {
        setInspection(null)
      }
    } finally {
      clearInterval(pollCache)
      if (gen === loadGen.current && mounted.current) {
        setLoading(false)
      }
    }
  }, [flatId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const timers = remarkTimers.current
    const pending = pendingPersist.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
      pending.clear()
    }
  }, [flatId])

  const saveResponses = useCallback(async (responses: InspectionResponse[]) => {
    const current = inspectionRef.current
    if (!current) return
    markSaving()
    const withProgress = applyCompletionToInspection(current, responses)
    setInspection(withProgress)
    void saveInspection(withProgress).catch(() => {})
    patchFlatCompletionLive(withProgress.flatId, withProgress.completionPct ?? 0, {
      status: 'in_progress' as Flat['status'],
    })

    const slim = responses.map(({ id, itemId, categoryId, status, remarks }) => ({
      id, itemId, categoryId, status, remarks,
    }))

    try {
      await inspectionsApi.save(current.id, slim as any)
    } catch {
      await queueChange('save_inspection', {
        inspectionId: current.id,
        responses: slim,
      })
    }
    markSaved()
  }, [markSaving, markSaved])

  const flushPendingSaves = useCallback(async () => {
    remarkTimers.current.forEach((t) => clearTimeout(t))
    remarkTimers.current.clear()

    const tasks = [...pendingPersist.current.values()]
    pendingPersist.current.clear()
    await Promise.all(tasks.map((fn) => fn().catch(() => {})))
  }, [])

  const updateResponse = useCallback(
    (itemId: string, patch: Partial<InspectionResponse>) => {
      const current = inspectionRef.current
      if (!current) return

      const existing = current.responses.find((r) => r.itemId === itemId)
      if (!existing) return

      if (
        patch.status === 'fail' &&
        !(patch.remarks?.trim() || existing.remarks?.trim())
      ) {
        toast.error('Add remarks before marking as Fail')
        return
      }

      const merged: InspectionResponse = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      const responses = current.responses.map((r) =>
        r.itemId === itemId ? merged : r
      )
      const updated = applyCompletionToInspection(
        { ...current, lastUpdated: new Date().toISOString() },
        responses
      )

      setInspection(updated)
      patchFlatCompletionLive(updated.flatId, updated.completionPct ?? 0, {
        status: 'in_progress' as Flat['status'],
      })

      const isRemarksOnly =
        Object.keys(patch).length === 1 && patch.remarks !== undefined

      if (isRemarksOnly) {
        const prev = remarkTimers.current.get(itemId)
        if (prev) clearTimeout(prev)
        pendingPersist.current.set(itemId, () => {
          const latest = inspectionRef.current?.responses.find((r) => r.itemId === itemId)
          return persistResponseToServer(latest ?? merged, { trackUi: true })
        })
        remarkTimers.current.set(
          itemId,
          setTimeout(() => {
            remarkTimers.current.delete(itemId)
            const fn = pendingPersist.current.get(itemId)
            if (fn) {
              pendingPersist.current.delete(itemId)
              fn()
            }
          }, REMARKS_DEBOUNCE_MS)
        )
        void saveInspectionDelta(updated, merged).catch(() => {})
        return
      }

      const prev = remarkTimers.current.get(itemId)
      if (prev) clearTimeout(prev)
      remarkTimers.current.delete(itemId)
      pendingPersist.current.delete(itemId)

      // Instant feedback: local persist + Saved, then sync API in background
      markSaving()
      void saveInspectionDelta(updated, merged)
        .then(() => markSaved())
        .catch(() => {
          inFlightSaves.current = Math.max(0, inFlightSaves.current - 1)
          setSaveState('idle')
          setGlobalSaveState('idle')
        })
      void persistFlatCompletion(updated.flatId, updated.completionPct ?? 0, {
        status: 'in_progress' as Flat['status'],
      })
      void persistResponseToServer(merged, { trackUi: false })
    },
    [persistResponseToServer, markSaving, markSaved, setGlobalSaveState]
  )

  const submit = async () => {
    if (!inspection) return
    await flushPendingSaves()
    try {
      await inspectionsApi.submit(inspection.id)
      toast.success('Inspection submitted for QA review')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
      const status = axiosErr?.response?.status
      const serverMsg = axiosErr?.response?.data?.error
      const isNetwork = !status || status >= 500

      if (isNetwork) {
        try {
          await queueChange('submit_inspection', { inspectionId: inspection.id })
          toast.success('Saved offline — will submit when back online')
        } catch {
          toast.error('Failed to save submission offline')
        }
      } else {
        toast.error(serverMsg || 'Cannot submit inspection yet')
      }
    }
    await load()
  }

  return {
    inspection,
    loading,
    saveState,
    load,
    saveResponses,
    updateResponse,
    flushPendingSaves,
    submit,
    setInspection,
  }
}
