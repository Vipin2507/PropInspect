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

  useEffect(() => {
    const timer = setInterval(() => {
      if (inspectionRef.current) saveResponses(inspectionRef.current.responses)
    }, 30000)
    return () => {
      clearInterval(timer)
      if (inspectionRef.current) saveResponses(inspectionRef.current.responses)
    }
  }, [saveResponses])

  // base64 is a data: URI — guaranteed to render in Android WebView
  const handleImageAdd = async (responseId: string, file: File, base64: string) => {
    if (!inspectionRef.current) return
    const current = inspectionRef.current

    const img: SnagImage = {
      id: crypto.randomUUID(),
      inspectionId: current.id,
      responseId,
      type: 'evidence',
      url: base64,         // base64 as fallback URL
      caption: '',
      uploadedAt: new Date().toISOString(),
      isLocal: true,
      localBlob: base64,   // stored as base64 — renders everywhere
    }

    // Optimistically update UI immediately so image is visible right away
    const optimisticResponses = current.responses.map((r) =>
      r.id === responseId ? { ...r, images: [...r.images, img] } : r
    )
    setInspection({ ...current, responses: optimisticResponses })

    // Upload to server in background if online
    if (navigator.onLine) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('inspectionId', current.id)
      fd.append('responseId', responseId)
      fd.append('type', 'evidence')
      try {
        const { data } = await imagesApi.upload(fd)
        // Replace local base64 with server URLs (keeps the same id)
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
          setInspection({ ...inspectionRef.current, responses: updatedResponses })
        }
      } catch {
        // Image stays as local base64 — will sync later
      }
    }
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
  const done    = catResponses.filter((r) => r.status !== 'pending').length
  const isLast  = catIndex === DEFAULT_CHECKLIST_CATEGORIES.length - 1
  const nextCat = DEFAULT_CHECKLIST_CATEGORIES[catIndex + 1]

  return (
    <div className="flex flex-col pb-28 md:pb-0">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.ENGINEER_FLAT(flatId!))}
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

      {/* Checklist items */}
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
        doneCount={done}
        totalCount={category.items.length}
      />
    </div>
  )
}
