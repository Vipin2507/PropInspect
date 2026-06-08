import { useEffect, useState } from 'react'
import { Badge } from '../ui/Badge'
import type { InspectionResponse } from '../../types'
import { Textarea } from '../ui/Textarea'
import { Camera } from 'lucide-react'
import { resolveImageOffline } from '../../utils/imageCache'
import { Lightbox } from '../ui/Lightbox'

export function ReviewItemRow({
  index,
  label,
  response,
  qaComment,
  onQaComment,
  onImageClick,
}: {
  index: number
  label: string
  response: InspectionResponse
  qaComment: string
  onQaComment: (v: string) => void
  onImageClick: (url: string) => void   // kept for backward compat but we handle lightbox internally
}) {
  const hasImages = response.images.length > 0
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [resolvedUrls, setResolvedUrls] = useState<string[]>([])

  // Thumbnail for the button preview
  const [firstImgSrc, setFirstImgSrc] = useState<string | undefined>(
    response.images[0]?.localBlob || response.images[0]?.thumbnailUrl || response.images[0]?.url
  )

  useEffect(() => {
    const img = response.images[0]
    if (!img || img.localBlob) return
    const urlToCheck = img.thumbnailUrl || img.url
    if (!urlToCheck) return
    resolveImageOffline(urlToCheck).then((r) => { if (r) setFirstImgSrc(r) })
  }, [response.images])

  // Resolve ALL image full-size URLs when lightbox is opened
  const handleViewImages = async () => {
    const urls = await Promise.all(
      response.images.map(async (img) => {
        const fullUrl = img.localBlob || img.url
        return (await resolveImageOffline(fullUrl)) ?? fullUrl
      })
    )
    setResolvedUrls(urls.filter(Boolean))
    setLightboxOpen(true)
  }

  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-semibold text-slate-800">
          {index}. {label}
        </span>
        <div className="flex items-center gap-3">
          {hasImages && (
            <button
              type="button"
              onClick={handleViewImages}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-sm font-medium text-primary touch-manipulation active:bg-primary/20"
            >
              {firstImgSrc ? (
                <img
                  src={firstImgSrc}
                  alt="thumbnail"
                  className="h-6 w-6 rounded object-cover"
                  onError={() => setFirstImgSrc(undefined)}
                />
              ) : (
                <Camera size={16} aria-hidden="true" />
              )}
              <span>{response.images.length} Photo{response.images.length > 1 ? 's' : ''}</span>
            </button>
          )}
          <Badge status={response.status} />
        </div>
      </div>

      {response.remarks && (
        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-500">Engineer: </span>
          {response.remarks}
        </div>
      )}

      <div className="mt-3">
        <label
          htmlFor={`qa-comment-${response.id}`}
          className="mb-1 block text-xs font-semibold text-slate-500"
        >
          QA Remark (optional)
        </label>
        <Textarea
          id={`qa-comment-${response.id}`}
          value={qaComment}
          onChange={(e) => onQaComment(e.target.value)}
          placeholder="Add a comment if there's an issue…"
          rows={2}
          className="w-full text-sm"
        />
      </div>

      {/* Lightbox — shows all images with swipe navigation */}
      {lightboxOpen && resolvedUrls.length > 0 && (
        <Lightbox
          images={resolvedUrls}
          startIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
