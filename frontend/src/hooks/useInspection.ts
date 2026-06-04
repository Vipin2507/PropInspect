import { useEffect, useState, useCallback } from 'react'
import { inspectionsApi } from '../utils/api'
import { saveInspection, getInspection } from '../utils/storage'
import { queueChange } from '../utils/sync'
import { useInspectionUiStore } from '../store/inspectionUiStore'
import type { Inspection, InspectionResponse } from '../types'
import toast from 'react-hot-toast'

export function useInspection(flatId: string | undefined) {
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const load = useCallback(async () => {
    if (!flatId) return
    setLoading(true)
    try {
      if (navigator.onLine) {
        const { data } = await inspectionsApi.getByFlat(flatId)
        setInspection(data)
        await saveInspection(data)
      } else {
        const cached = await getInspection(flatId)
        if (cached) setInspection(cached)
      }
    } catch {
      const cached = await getInspection(flatId)
      if (cached) setInspection(cached)
    } finally {
      setLoading(false)
    }
  }, [flatId])

  useEffect(() => {
    load()
  }, [load])

  const setGlobalSaveState = useInspectionUiStore((s) => s.setSaveState)

  const saveResponses = async (responses: InspectionResponse[]) => {
    if (!inspection) return
    setSaveState('saving')
    setGlobalSaveState('saving')
    const updated = { ...inspection, responses }
    setInspection(updated)
    await saveInspection(updated)
    if (navigator.onLine) {
      try {
        await inspectionsApi.save(inspection.id, responses)
      } catch {
        await queueChange('save_inspection', { inspectionId: inspection.id, responses })
      }
    } else {
      await queueChange('save_inspection', { inspectionId: inspection.id, responses })
    }
    setSaveState('saved')
    setGlobalSaveState('saved')
    setTimeout(() => {
      setSaveState('idle')
      setGlobalSaveState('idle')
    }, 2000)
  }

  const submit = async () => {
    if (!inspection) return
    try {
      if (navigator.onLine) {
        await inspectionsApi.submit(inspection.id)
        toast.success('Inspection submitted for review')
      } else {
        await queueChange('submit_inspection', { inspectionId: inspection.id })
        toast.success('Queued for sync when online')
      }
      await load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Submit failed')
      throw e
    }
  }

  return { inspection, loading, saveState, load, saveResponses, submit, setInspection }
}
