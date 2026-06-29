import { useEffect, useState, useCallback, useRef } from 'react'
import { inspectionsApi, responsesApi } from '../utils/api'
import { saveInspection, getInspection } from '../utils/storage'
import { queueChange } from '../utils/sync'
import { useInspectionUiStore } from '../store/inspectionUiStore'
import type { Inspection, InspectionResponse } from '../types'
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

  const setGlobalSaveState = useInspectionUiStore((s) => s.setSaveState)

  const markSaving = useCallback(() => {
    setSaveState('saving')
    setGlobalSaveState('saving')
  }, [setGlobalSaveState])

  const markSaved = useCallback(() => {
    setSaveState('saved')
    setGlobalSaveState('saved')
    setTimeout(() => {
      setSaveState('idle')
      setGlobalSaveState('idle')
    }, 2000)
  }, [setGlobalSaveState])

  const persistResponseToServer = useCallback(
    async (response: InspectionResponse) => {
      const current = inspectionRef.current
      if (!current) return

      if (response.status === 'fail' && !response.remarks?.trim()) return

      markSaving()
      try {
        await responsesApi.updateStatus(response.id, {
          status: response.status,
          remarks: response.remarks || undefined,
        })
      } catch {
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
      }
      markSaved()
    },
    [markSaving, markSaved]
  )

  const load = useCallback(async () => {
    if (!flatId) return
    setLoading(true)

    const cached = await getInspection(flatId)
    if (cached) {
      setInspection(cached)
      setLoading(false)
    }

    try {
      const { data } = await inspectionsApi.getByFlat(flatId)
      const merged = cached ? mergeInspections(cached, data) : data
      setInspection(merged)
      await saveInspection(merged)

      if (cached && hasLocalNewerResponses(cached, data)) {
        const slim = merged.responses.map(({ id, itemId, categoryId, status, remarks }) => ({
          id, itemId, categoryId, status, remarks,
        }))
        inspectionsApi.save(merged.id, slim as any).catch(() => {
          queueChange('save_inspection', { inspectionId: merged.id, responses: slim })
        })
      }
    } catch {
      if (!cached) setInspection(null)
    } finally {
      setLoading(false)
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
    const updated = { ...current, responses, lastUpdated: new Date().toISOString() }
    setInspection(updated)
    await saveInspection(updated)

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

      const merged: InspectionResponse = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      const responses = current.responses.map((r) =>
        r.itemId === itemId ? merged : r
      )
      const updated: Inspection = {
        ...current,
        responses,
        lastUpdated: new Date().toISOString(),
      }

      setInspection(updated)
      saveInspection(updated).catch(() => {})

      const isRemarksOnly =
        Object.keys(patch).length === 1 && patch.remarks !== undefined

      const persistLatest = () => {
        const latest = inspectionRef.current?.responses.find((r) => r.itemId === itemId)
        if (latest) return persistResponseToServer(latest)
      }

      if (isRemarksOnly) {
        const prev = remarkTimers.current.get(itemId)
        if (prev) clearTimeout(prev)
        pendingPersist.current.set(itemId, () => persistLatest() ?? Promise.resolve())
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
        return
      }

      const prev = remarkTimers.current.get(itemId)
      if (prev) clearTimeout(prev)
      remarkTimers.current.delete(itemId)
      pendingPersist.current.delete(itemId)
      persistLatest()
    },
    [persistResponseToServer]
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
