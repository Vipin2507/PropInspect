import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { resolveImageOffline } from '../../utils/imageCache'

/** Resolves a list of server URL strings to base64/offline-safe URLs */
function useResolvedImages(urls: string[]): string[] {
  const [resolved, setResolved] = useState<string[]>(urls)

  useEffect(() => {
    if (!urls.length) return
    let cancelled = false
    Promise.all(
      urls.map((u) =>
        u.startsWith('data:') ? Promise.resolve(u) : resolveImageOffline(u).then((r) => r ?? u)
      )
    ).then((results) => {
      if (!cancelled) setResolved(results)
    })
    return () => { cancelled = true }
  }, [urls.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  return resolved
}

export function Lightbox({
  src,
  images,
  startIndex = 0,
  onClose,
}: {
  src?: string | null
  images?: string[]
  startIndex?: number
  onClose: () => void
}) {
  const rawImages = images ?? (src ? [src] : [])
  const allImages = useResolvedImages(rawImages)

  const [index, setIndex] = useState(startIndex)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    setIndex(startIndex)
  }, [startIndex, src, images])

  if (!allImages.length) return null

  const current = allImages[Math.min(index, allImages.length - 1)]

  const goPrev = () => setIndex((i) => (i > 0 ? i - 1 : allImages.length - 1))
  const goNext = () => setIndex((i) => (i < allImages.length - 1 ? i + 1 : 0))

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) goPrev()
      else goNext()
    }
    touchStartX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-20 flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center text-white"
        onClick={onClose}
      >
        <X size={32} />
      </button>

      {allImages.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-2 z-20 flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full bg-black/40 text-white"
            onClick={(e) => { e.stopPropagation(); goPrev() }}
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            className="absolute right-2 z-20 flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full bg-black/40 text-white md:right-14"
            onClick={(e) => { e.stopPropagation(); goNext() }}
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <img
        src={current}
        alt=""
        className="max-h-full max-w-full touch-manipulation object-contain"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      />

      {allImages.length > 1 && (
        <p className="absolute bottom-6 text-sm text-white/80">
          {index + 1} / {allImages.length}
        </p>
      )}
    </div>
  )
}
