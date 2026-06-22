import { useParams, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import { useInspection } from '../../hooks/useInspection'
import { ChecklistCategory } from '../../components/inspection/ChecklistCategory'
import { SubmitBar } from '../../components/inspection/SubmitBar'
import { ROUTES } from '../../constants/routes'
import { imagesApi } from '../../utils/api'
import { queueChange } from '../../utils/sync'
import { saveInspection } from '../../utils/storage'
import { generateId } from '../../utils/id'
import type { InspectionResponse, SnagImage } from '../../types'
import { Spinner } from '../../components/ui/Spinner'

export default function FillChecklist() {
  const { flatId, categoryId } = useParams<{ flatId: string; categoryId: string }>()
  const navigate = useNavigate()

  const catIndex = DEFAULT_CHECKLIST_CATEGORIES.findIndex((c) => c.id === (categoryId || 'civil'))
  const category = DEFAULT_CHECKLIST_CATEGORIES[catIndex >= 0 ? catIndex : 0]

  const {
    inspection,
    loading,
    saveResponses,
    updateResponse,
    flushPendingSaves,
    setInspection,
  } = useInspection(flatId)

  const inspectionRef = useRef(inspection)
  inspectionRef.current = inspection

  const handleChange = useCallback(
    (itemId: string, patch: Partial<InspectionResponse>) => {
      updateResponse(itemId, patch)
    },
    [updateResponse]
  )

  const navigateAway = useCallback(
    async (to: string) => {
      await flushPendingSaves()
      if (inspectionRef.current) {
        await saveResponses(inspectionRef.current.responses)
      }
      navigate(to)
    },
    [flushPendingSaves, saveResponses, navigate]
  )

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !flatId) return
    let handle: { remove: () => void } | undefined
    App.addListener('backButton', () => {
      navigateAway(ROUTES.ENGINEER_FLAT(flatId))
    }).then((h) => { handle = h })
    return () => { handle?.remove() }
  }, [flatId, navigateAway])

  const handleImageAdd = async (responseId: string, file: File, base64: string) => {
    if (!inspectionRef.current) return
    const current = inspectionRef.current

    const img: SnagImage = {
      id: generateId(),
      inspectionId: current.id,
      responseId,
      type: 'evidence',
      url: base64,
      caption: '',
      uploadedAt: new Date().toISOString(),
      isLocal: true,
      localBlob: base64,
    }

    const optimisticResponses = current.responses.map((r) =>
      r.id === responseId ? { ...r, images: [...r.images, img] } : r
    )
    const updated = { ...current, responses: optimisticResponses, lastUpdated: new Date().toISOString() }
    setInspection(updated)
    await saveInspection(updated)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('inspectionId', current.id)
    fd.append('responseId', responseId)
    fd.append('type', 'evidence')
    try {
      const { data } = await imagesApi.upload(fd)
      const updatedResponses = inspectionRef.current?.responses.map((r) =>
        r.id === responseId
          ? {
              ...r,
              images: r.images.map((i) =>
                i.id === img.id
                  ? { ...i, url: data.url, thumbnailUrl: data.thumbnailUrl, isLocal: false }
                  : i
              ),
            }
          : r
      )
      if (updatedResponses && inspectionRef.current) {
        const withServerUrls = { ...inspectionRef.current, responses: updatedResponses }
        setInspection(withServerUrls)
        await saveInspection(withServerUrls)
      }
    } catch {
      await queueChange('upload_image', {
        imageId: img.id,
        inspectionId: current.id,
        responseId,
        base64,
        type: 'evidence',
      })
    }
  }

  const handleImageRemove = async (responseId: string, imageId: string) => {
    if (!inspectionRef.current) return
    const responses = inspectionRef.current.responses.map((r) =>
      r.id === responseId ? { ...r, images: r.images.filter((i) => i.id !== imageId) } : r
    )
    const updated = { ...inspectionRef.current, responses, lastUpdated: new Date().toISOString() }
    setInspection(updated)
    await saveInspection(updated)
  }

  if (loading || !inspection) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const catResponses = inspection.responses.filter((r) => r.categoryId === category.id)
  const done    = catResponses.filter((r) => r.status !== 'pending').length
  const isLast  = catIndex === DEFAULT_CHECKLIST_CATEGORIES.length - 1
  const nextCat = DEFAULT_CHECKLIST_CATEGORIES[catIndex + 1]

  return (
    <div className="flex flex-col pb-28 md:pb-0">
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateAway(ROUTES.ENGINEER_FLAT(flatId!))}
            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full active:bg-slate-100"
            aria-label="Back"
          >
            <ArrowLeft size={20} className="text-slate-600" aria-hidden="true" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold text-slate-900">{category.name}</h1>
            <div className="mt-0.5 flex items-center justify-center gap-2">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${category.items.length ? (done / category.items.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {done}/{category.items.length}
              </span>
            </div>
          </div>
          <div className="w-11" />
        </div>
      </div>

      <div className="space-y-3 p-4">
        <ChecklistCategory
          category={category}
          responses={catResponses}
          onChange={handleChange}
          onImageAdd={handleImageAdd}
          onImageRemove={handleImageRemove}
        />
      </div>

      <SubmitBar
        onNext={() => navigateAway(ROUTES.ENGINEER_CHECKLIST(flatId!, nextCat.id))}
        onSummary={() => navigateAway(ROUTES.ENGINEER_INSPECTION_SUMMARY(flatId!))}
        isLastCategory={isLast}
        isComplete={done === category.items.length}
        doneCount={done}
        totalCount={category.items.length}
      />
    </div>
  )
}
