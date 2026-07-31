import { useParams, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { useMotionSafe } from '../../hooks/useMotionSafe'

export default function FillChecklist() {
  const { flatId, categoryId } = useParams<{ flatId: string; categoryId: string }>()
  const navigate = useNavigate()
  const { fadeUp, reduced } = useMotionSafe()

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
    }).then((h) => {
      handle = h
    })
    return () => {
      handle?.remove()
    }
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
    const updated = {
      ...current,
      responses: optimisticResponses,
      lastUpdated: new Date().toISOString(),
    }
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
    const updated = {
      ...inspectionRef.current,
      responses,
      lastUpdated: new Date().toISOString(),
    }
    setInspection(updated)
    await saveInspection(updated)
  }

  if (loading || !inspection) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  const catResponses = inspection.responses.filter((r) => r.categoryId === category.id)
  const done = catResponses.filter((r) => r.status !== 'pending').length
  const isLast = catIndex === DEFAULT_CHECKLIST_CATEGORIES.length - 1
  const nextCat = DEFAULT_CHECKLIST_CATEGORIES[catIndex + 1]
  const pct = category.items.length ? (done / category.items.length) * 100 : 0

  return (
    <motion.div className="flex flex-col pb-28 md:pb-4" {...fadeUp}>
      <div className="sticky top-0 z-20 border-b border-ink-100 bg-surface/95 px-3 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateAway(ROUTES.ENGINEER_FLAT(flatId!))}
            className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-50 hover:text-brand-600"
            aria-label="Back"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={category.id}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="truncate font-display text-sm font-bold text-ink-950 md:text-base"
              >
                {category.name}
              </motion.h1>
            </AnimatePresence>
            <div className="mt-1 flex items-center justify-center gap-2">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-ink-100 sm:w-36">
                <motion.div
                  className="h-full rounded-full bg-brand-600"
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-[11px] font-semibold tabular text-ink-400">
                {done}/{category.items.length}
              </span>
            </div>
          </div>
          <div className="w-10" />
        </div>

        <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {DEFAULT_CHECKLIST_CATEGORIES.map((c, i) => {
            const cDone = inspection.responses
              .filter((r) => r.categoryId === c.id)
              .filter((r) => r.status !== 'pending').length
            const cTotal = c.items.length
            const active = c.id === category.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => navigateAway(ROUTES.ENGINEER_CHECKLIST(flatId!, c.id))}
                className={`relative z-0 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold touch-manipulation transition-colors duration-fast ${
                  active
                    ? 'text-white'
                    : cDone === cTotal
                      ? 'bg-success-100 text-success-600'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                }`}
              >
                {active && !reduced && (
                  <motion.span
                    layoutId="checklist-cat-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-brand-600"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {active && reduced && (
                  <span className="absolute inset-0 -z-10 rounded-full bg-brand-600" />
                )}
                <span className="relative z-10">
                  {i + 1}. {c.name.split(' ')[0]}
                  <span className="ml-1 opacity-70">
                    {cDone}/{cTotal}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-3 md:p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={category.id}
            initial={reduced ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: -12 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChecklistCategory
              category={category}
              responses={catResponses}
              onChange={handleChange}
              onImageAdd={handleImageAdd}
              onImageRemove={handleImageRemove}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <SubmitBar
        onNext={() => navigateAway(ROUTES.ENGINEER_CHECKLIST(flatId!, nextCat.id))}
        onSummary={() => navigateAway(ROUTES.ENGINEER_INSPECTION_SUMMARY(flatId!))}
        isLastCategory={isLast}
        isComplete={done === category.items.length}
        doneCount={done}
        totalCount={category.items.length}
      />
    </motion.div>
  )
}
