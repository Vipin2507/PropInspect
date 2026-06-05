import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useCallback, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import { useInspection } from '../../hooks/useInspection'
import { ChecklistCategory } from '../../components/inspection/ChecklistCategory'
import { SubmitBar } from '../../components/inspection/SubmitBar'
import { ROUTES } from '../../constants/routes'
import { imagesApi } from '../../utils/api'
import type { InspectionResponse, SnagImage } from '../../types'
import { Spinner } from '../../components/ui/Spinner'

export default function FillChecklist() {
  const { flatId, categoryId } = useParams<{ flatId: string; categoryId: string }>()
  const navigate = useNavigate()

  const catIndex = DEFAULT_CHECKLIST_CATEGORIES.findIndex((c) => c.id === (categoryId || 'civil'))
  const category = DEFAULT_CHECKLIST_CATEGORIES[catIndex >= 0 ? catIndex : 0]

  const { inspection, loading, saveResponses, setInspection } = useInspection(flatId)

  // Stable ref so interval never stales
  const inspectionRef = useRef(inspection)
  inspectionRef.current = inspection

  const handleChange = useCallback(
    (itemId: string, patch: Partial<InspectionResponse>) => {
      if (!inspectionRef.current) return
      const responses = inspectionRef.current.responses.map((r) =>
        r.itemId === itemId ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
      )
      setInspection({ ...inspectionRef.current, responses })
    },
    [setInspection]
  )

  // Auto-save every 30s, save on unmount
  useEffect(() => {
    const timer = setInterval(() => {
      if (inspectionRef.current) saveResponses(inspectionRef.current.responses)
    }, 30000)
    return () => {
      clearInterval(timer)
      if (inspectionRef.current) saveResponses(inspectionRef.current.responses)
    }
  }, [saveResponses])

  const handleImageAdd = async (responseId: string, file: File, preview: string) => {
    if (!inspectionRef.current) return
    const inspection = inspectionRef.current
    const img: SnagImage = {
      id: crypto.randomUUID(),
      inspectionId: inspection.id,
      responseId,
      type: 'evidence',
      url: preview,
      caption: '',
      uploadedAt: new Date().toISOString(),
      isLocal: true,
      localBlob: preview,
    }
    if (navigator.onLine) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('inspectionId', inspection.id)
      fd.append('responseId', responseId)
      fd.append('type', 'evidence')
      try {
        const { data } = await imagesApi.upload(fd)
        img.url = data.url
        img.thumbnailUrl = data.thumbnailUrl
        img.isLocal = false
      } catch { /* keep local */ }
    }
    const responses = inspection.responses.map((r) =>
      r.id === responseId ? { ...r, images: [...r.images, img] } : r
    )
    setInspection({ ...inspection, responses })
  }

  const handleImageRemove = (responseId: string, imageId: string) => {
    if (!inspectionRef.current) return
    const responses = inspectionRef.current.responses.map((r) =>
      r.id === responseId ? { ...r, images: r.images.filter((i) => i.id !== imageId) } : r
    )
    setInspection({ ...inspectionRef.current, responses })
  }

  if (loading || !inspection) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const catResponses = inspection.responses.filter((r) => r.categoryId === category.id)
  const done   = catResponses.filter((r) => r.status !== 'pending').length
  const isLast = catIndex === DEFAULT_CHECKLIST_CATEGORIES.length - 1
  const nextCat = DEFAULT_CHECKLIST_CATEGORIES[catIndex + 1]

  return (
    <div className="flex flex-col pb-28 md:pb-0">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(ROUTES.ENGINEER_FLAT(flatId!))}
            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center gap-2 rounded-full text-sm font-medium text-slate-600 active:bg-slate-100"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold text-slate-900">{category.name}</h1>
            <p className="text-xs font-medium text-slate-500">
              {done} / {category.items.length} items
            </p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Checklist body */}
      <div className="p-4">
        <ChecklistCategory
          category={category}
          responses={catResponses}
          onChange={handleChange}
          onImageAdd={handleImageAdd}
          onImageRemove={handleImageRemove}
        />
      </div>

      <SubmitBar
        onNext={() => {
          saveResponses(inspection.responses)
          navigate(ROUTES.ENGINEER_CHECKLIST(flatId!, nextCat.id))
        }}
        onSummary={() => {
          saveResponses(inspection.responses)
          navigate(ROUTES.ENGINEER_INSPECTION_SUMMARY(flatId!))
        }}
        isLastCategory={isLast}
        isComplete={done === category.items.length}
      />
    </div>
  )
}
