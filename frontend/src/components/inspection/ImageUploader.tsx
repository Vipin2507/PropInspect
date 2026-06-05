import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import type { SnagImage } from '../../types'
import { compressImage } from '../../utils/imageUtils'
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
  onAdd: (file: File, preview: string) => void
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
        const blob    = await compressImage(file)
        const preview = URL.createObjectURL(blob)
        onAdd(new File([blob], file.name, { type: blob.type }), preview)
      } catch (err) {
        console.error('Image compression failed:', err)
      }
    }
    e.target.value = ''
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Thumbnails */}
        {images.map((img, idx) => (
          <div
            key={img.id}
            className="group relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200"
          >
            <button
              type="button"
              className="h-full w-full"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx) }}
              aria-label={`View image ${idx + 1}`}
            >
              <img
                src={img.localBlob || img.thumbnailUrl || img.url}
                alt={img.caption || `Image ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
            {!readOnly && (
              <button
                type="button"
                className={cn(
                  'absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center',
                  'rounded-full bg-fail text-white shadow-md',
                  'opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'
                )}
                onClick={(e) => { e.stopPropagation(); onRemove(img.id) }}
                aria-label="Remove image"
              >
                <X size={11} strokeWidth={3} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}

        {/* Add button */}
        {!readOnly && images.length < maxImages && (
          <>
            {trigger ? (
              <div
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="cursor-pointer"
              >
                {trigger}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 active:border-primary active:text-primary touch-manipulation"
                aria-label="Add image"
              >
                <Camera size={22} aria-hidden="true" />
              </button>
            )}
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
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={images.map((i) => i.localBlob || i.url)}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
