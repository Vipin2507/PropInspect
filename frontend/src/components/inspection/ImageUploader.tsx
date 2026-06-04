import { useRef, useState } from 'react'
import { Camera, X, Trash2 } from 'lucide-react'
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
        const blob = await compressImage(file)
        const preview = URL.createObjectURL(blob)
        onAdd(new File([blob], file.name, { type: blob.type }), preview)
      } catch (error) {
        console.error('Image compression failed:', error)
      }
    }
    // Reset input to allow same file selection again
    e.target.value = ''
  }

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)

  const imageThumbs = (
    <div className="flex gap-2 overflow-x-auto py-1">
      {images.map((img, index) => (
        <div
          key={img.id}
          className="group relative h-14 w-14 shrink-0 cursor-pointer rounded-lg"
          onClick={() => openLightbox(index)}
        >
          <img
            src={img.localBlob || img.thumbnailUrl || img.url}
            alt={img.caption || `Image ${index + 1}`}
            className="h-full w-full rounded-lg object-cover"
          />
          {!readOnly && (
            <button
              type="button"
              className="absolute -right-1.5 -top-1.5 z-10 hidden h-5 w-5 items-center justify-center rounded-full bg-fail text-white shadow-md group-hover:flex"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(img.id)
              }}
              aria-label="Remove image"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="flex items-center gap-2">
        {images.length > 0 && imageThumbs}

        {!readOnly && images.length < maxImages && (
          <>
            {trigger ? (
              <div onClick={() => inputRef.current?.click()}>{trigger}</div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-primary hover:text-primary"
                aria-label="Add image"
              >
                <Camera size={24} />
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
          onClose={closeLightbox}
        />
      )}
    </>
  )
}
