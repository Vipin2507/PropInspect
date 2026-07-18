import { useRef, useState, useEffect } from 'react'
import { Camera, X, ImageIcon } from 'lucide-react'
import type { SnagImage } from '../../types'
import { compressImage, blobToBase64 } from '../../utils/imageUtils'
import { resolveMediaUrl } from '../../utils/api'
import { resolveImageOffline } from '../../utils/imageCache'
import { cn } from '../../utils/cn'
import { Lightbox } from '../ui/Lightbox'
import { Capacitor } from '@capacitor/core'
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera'

/** Renders a single thumbnail, resolving via IndexedDB cache for offline support */
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
      <div className="flex h-full w-full items-center justify-center">
        <ImageIcon size={20} className="text-slate-400" aria-hidden="true" />
      </div>
    )
  }
  return (
    <button type="button" className="h-full w-full" onClick={onClick} aria-label="View image">
      <img src={src} alt="Photo" className="h-full w-full object-cover" onError={() => setSrc(undefined)} />
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
}: {
  images: SnagImage[]
  onAdd: (file: File, base64: string) => void
  onRemove: (id: string) => void
  readOnly?: boolean
  maxImages?: number
  trigger?: React.ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const isNative = Capacitor.isNativePlatform()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const blob   = await compressImage(file)
        // Use base64 data URI — works reliably in Capacitor Android WebView
        // unlike blob: URLs which can fail to render
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
      // User cancelled or permission denied
      console.warn('Native photo pick failed:', err)
    }
  }

  if (readOnly && images.length === 0) return null

  return (
    <>
      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 py-1">
          {images.map((img, idx) => {
            return (
              <div
                key={img.id}
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <OfflineThumbnail img={img} onClick={() => setLightboxIndex(idx)} />

                {/* Remove button */}
                {!readOnly && (
                  <button
                    type="button"
                    className="absolute right-0.5 top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-fail text-white shadow"
                    onClick={(e) => { e.stopPropagation(); onRemove(img.id) }}
                    aria-label="Remove photo"
                  >
                    <X size={12} strokeWidth={3} aria-hidden="true" />
                  </button>
                )}
              </div>
            )
          })}

          {/* Inline add button when there are already images */}
          {!readOnly && images.length < maxImages && !trigger && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (isNative) handleNativePick()
                else inputRef.current?.click()
              }}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 active:border-primary active:text-primary touch-manipulation"
              aria-label="Add another photo"
            >
              <Camera size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Trigger button (shown when no images OR custom trigger provided) */}
      {!readOnly && images.length < maxImages && (
        <>
          {trigger ? (
            <div
              onClick={(e) => {
                e.stopPropagation()
                if (isNative) handleNativePick()
                else inputRef.current?.click()
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
                if (isNative) handleNativePick()
                else inputRef.current?.click()
              }}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 active:border-primary active:text-primary touch-manipulation"
              aria-label="Add photo"
            >
              <Camera size={18} aria-hidden="true" />
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
