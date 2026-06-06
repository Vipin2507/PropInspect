import { useRef, useState } from 'react'
import { Camera, X, ImageIcon } from 'lucide-react'
import type { SnagImage } from '../../types'
import { compressImage, blobToBase64 } from '../../utils/imageUtils'
import { resolveMediaUrl } from '../../utils/api'
import { cn } from '../../utils/cn'
import { Lightbox } from '../ui/Lightbox'

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

  if (readOnly && images.length === 0) return null

  return (
    <>
      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 py-1">
          {images.map((img, idx) => {
          // Prefer base64 (localBlob), then remote URL resolved to full path
            const src = img.localBlob || resolveMediaUrl(img.thumbnailUrl) || resolveMediaUrl(img.url)
            return (
              <div
                key={img.id}
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                {src ? (
                  <button
                    type="button"
                    className="h-full w-full"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx) }}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img
                      src={src}
                      alt={`Photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                      // Fallback: show icon if img fails to load
                      onError={(ev) => {
                        ;(ev.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </button>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon size={20} className="text-slate-400" aria-hidden="true" />
                  </div>
                )}

                {/* Remove button — always visible on touch (no hover needed) */}
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
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
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
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
              className="cursor-pointer"
            >
              {trigger}
            </div>
          ) : images.length === 0 ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 active:border-primary active:text-primary touch-manipulation"
              aria-label="Add photo"
            >
              <Camera size={18} aria-hidden="true" />
              Add Photo
            </button>
          ) : null}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

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
