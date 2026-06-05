import { useEffect, useState, useCallback, useRef } from 'react'
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

  // Keep a ref to the latest inspection so saveResponses doesn't need it as a dep
  const inspectionRef = useRef<Inspection | null>(null)
  inspectionRef.current = inspection

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

  const saveResponses = useCallback(async (responses: InspectionResponse[]) => {
    const current = inspectionRef.current
    if (!current) return
    setSaveState('saving')
    setGlobalSaveState('saving')
    const updated = { ...current, responses }
    setInspection(updated)
    await saveInspection(updated)
    if (navigator.onLine) {
      try {
        await inspectionsApi.save(current.id, responses)
      } catch {
        await queueChange('save_inspection', { inspectionId: current.id, responses })
      }
    } else {
      await queueChange('save_inspection', { inspectionId: current.id, responses })
    }
    setSaveState('saved')
    setGlobalSaveState('saved')
    setTimeout(() => {
      setSaveState('idle')
      setGlobalSaveState('idle')
    }, 2000)
  }, [setGlobalSaveState])

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
