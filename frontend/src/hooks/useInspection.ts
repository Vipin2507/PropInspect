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

  const inspectionRef = useRef<Inspection | null>(null)
  inspectionRef.current = inspection

  const load = useCallback(async () => {
    if (!flatId) return
    setLoading(true)

    // Always show cached first — instant render online and offline
    const cached = await getInspection(flatId)
    if (cached) {
      setInspection(cached)
      setLoading(false)
    }

    try {
      const { data } = await inspectionsApi.getByFlat(flatId)
      setInspection(data)
      await saveInspection(data)
    } catch {
      // Network unavailable — stay with cached
      if (!cached) setInspection(null)
    } finally {
      setLoading(false)
    }
  }, [flatId])

  useEffect(() => { load() }, [load])

  const setGlobalSaveState = useInspectionUiStore((s) => s.setSaveState)

  const saveResponses = useCallback(async (responses: InspectionResponse[]) => {
    const current = inspectionRef.current
    if (!current) return
    setSaveState('saving')
    setGlobalSaveState('saving')
    const updated = { ...current, responses }
    setInspection(updated)
    await saveInspection(updated) // always persist locally first
    try {
      await inspectionsApi.save(current.id, responses)
    } catch {
      await queueChange('save_inspection', { inspectionId: current.id, responses })
    }
    setSaveState('saved')
    setGlobalSaveState('saved')
    setTimeout(() => { setSaveState('idle'); setGlobalSaveState('idle') }, 2000)
  }, [setGlobalSaveState])

  const submit = async () => {
    if (!inspection) return
    try {
      await inspectionsApi.submit(inspection.id)
      toast.success('Inspection submitted for review')
    } catch {
      await queueChange('submit_inspection', { inspectionId: inspection.id })
      toast.success('Saved offline — will submit when back online')
    }
    await load()
  }

  return { inspection, loading, saveState, load, saveResponses, submit, setInspection }
}
