import { useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, X, ImageIcon, Plus } from 'lucide-react'
import type { SnagImage } from '../../types'
import { compressImage, blobToBase64 } from '../../utils/imageUtils'
import { resolveMediaUrl } from '../../utils/api'
import { resolveImageOffline } from '../../utils/imageCache'
import { cn } from '../../utils/cn'
import { Lightbox } from '../ui/Lightbox'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { Capacitor } from '@capacitor/core'
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera'

function OfflineThumbnail({ img, onClick }: { img: SnagImage; onClick: () => void }) {
  const initial = img.localBlob || resolveMediaUrl(img.thumbnailUrl) || resolveMediaUrl(img.url)
  const [src, setSrc] = useState<string | undefined>(initial)

  useEffect(() => {
    if (img.localBlob) return
    const urlToCheck = img.thumbnailUrl || img.url
    if (!urlToCheck) return
    resolveImageOffline(urlToCheck).then((resolved) => {
      if (resolved) setSrc(resolved)
    })
  }, [img.thumbnailUrl, img.url, img.localBlob])

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-50">
        <ImageIcon size={18} className="text-ink-300" aria-hidden="true" />
      </div>
    )
  }
  return (
    <button type="button" className="h-full w-full" onClick={onClick} aria-label="View image">
      <img
        src={src}
        alt="Photo"
        className="h-full w-full object-cover transition-transform duration-fast group-hover:scale-105"
        onError={() => setSrc(undefined)}
      />
    </button>
  )
}

const MAX = parseInt(import.meta.env.VITE_MAX_IMAGES_PER_ITEM || '5', 10)

export function ImageUploader({
  images,
  onAdd,
  onRemove,
  readOnly,
  maxImages = MAX,
  trigger,
  compact,
}: {
  images: SnagImage[]
  onAdd: (file: File, base64: string) => void
  onRemove: (id: string) => void
  readOnly?: boolean
  maxImages?: number
  trigger?: React.ReactNode
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const { reduced } = useMotionSafe()
  const isNative = Capacitor.isNativePlatform()

  const pick = () => {
    if (isNative) handleNativePick()
    else inputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const blob = await compressImage(file)
        const base64 = await blobToBase64(blob)
        onAdd(new File([blob], file.name, { type: blob.type }), base64)
      } catch (err) {
        console.error('Image processing failed:', err)
      }
    }
    e.target.value = ''
  }

  const handleNativePick = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        source: CameraSource.Prompt,
        resultType: CameraResultType.Uri,
        quality: 85,
        correctOrientation: true,
      })
      const webPath = photo.webPath
      if (!webPath) return

      const resp = await fetch(webPath)
      const blob = await resp.blob()
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })

      const compressed = await compressImage(file)
      const base64 = await blobToBase64(compressed)
      onAdd(new File([compressed], file.name, { type: compressed.type }), base64)
    } catch (err) {
      console.warn('Native photo pick failed:', err)
    }
  }

  if (readOnly && images.length === 0) return null

  const thumb = compact ? 'h-12 w-12' : 'h-[4.25rem] w-[4.25rem]'

  return (
    <>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5 py-0.5">
          <AnimatePresence initial={false}>
            {images.map((img, idx) => (
              <motion.div
                key={img.id}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'group relative shrink-0 overflow-hidden rounded-md border border-ink-100 bg-ink-50 shadow-xs',
                  thumb
                )}
              >
                <OfflineThumbnail img={img} onClick={() => setLightboxIndex(idx)} />
                {!readOnly && (
                  <button
                    type="button"
                    className="absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-danger-600 text-white shadow-sm touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(img.id)
                    }}
                    aria-label="Remove photo"
                  >
                    <X size={10} strokeWidth={3} aria-hidden="true" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {!readOnly && images.length < maxImages && !trigger && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                pick()
              }}
              className={cn(
                'flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-brand-300 bg-brand-50/40 text-brand-600 transition-colors duration-fast hover:border-brand-500 hover:bg-brand-50 active:scale-[0.97] touch-manipulation',
                thumb
              )}
              aria-label="Add another photo"
            >
              <Plus size={compact ? 14 : 16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {!readOnly && images.length < maxImages && (
        <>
          {trigger ? (
            <div
              onClick={(e) => {
                e.stopPropagation()
                pick()
              }}
              className="cursor-pointer"
            >
              {trigger}
            </div>
          ) : images.length === 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                pick()
              }}
              className={cn(
                'group flex w-full items-center justify-center gap-2 rounded-md',
                'border border-dashed border-ink-200 bg-ink-50/40',
                'font-semibold text-ink-500',
                'transition-all duration-fast',
                'hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700',
                'active:scale-[0.99] touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100',
                compact ? 'h-9 gap-1.5 text-xs' : 'h-14 gap-2.5 text-sm'
              )}
              aria-label="Add photo"
            >
              <Camera size={compact ? 14 : 15} className="text-brand-600" aria-hidden="true" />
              Add Photo
            </button>
          ) : null}
        </>
      )}

      {!isNative && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={images.map((i) => i.localBlob || resolveMediaUrl(i.url) || '')}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
