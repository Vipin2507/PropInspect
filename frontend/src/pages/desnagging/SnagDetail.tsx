import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { snagsApi } from '../../utils/api'
import { SnagTimeline } from '../../components/desnagging/SnagTimeline'
import { RectificationForm } from '../../components/desnagging/RectificationForm'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../store/authStore'
import type { Snag, SnagImage } from '../../types'
import toast from 'react-hot-toast'
import { ArrowLeft, Tag, Layers } from 'lucide-react'
import { Lightbox } from '../../components/ui/Lightbox'
import { Badge } from '../../components/ui/Badge'
import { ROUTES } from '../../constants/routes'
import { Spinner } from '../../components/ui/Spinner'

function ImageGrid({
  title,
  images,
  onImageClick,
}: {
  title: string
  images: SnagImage[]
  onImageClick: (src: string) => void
}) {
  if (!images.length) return null
  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-slate-800">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onImageClick(img.localBlob || img.url)}
            className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 sm:h-24 sm:w-24"
          >
            <img
              src={img.localBlob || img.thumbnailUrl || img.url}
              alt={img.caption || title}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SnagDetail() {
  const { snagId } = useParams<{ snagId: string }>()
  const [snag, setSnag] = useState<Snag | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (snagId) snagsApi.get(snagId).then(({ data }) => setSnag(data))
  }, [snagId])

  const handleRectify = async () => {
    if (!snagId || !remarks.trim()) {
      toast.error('Remarks are required')
      return
    }
    setSubmitting(true)
    try {
      await snagsApi.rectify(snagId, { remarks })
      toast.success('Snag marked as rectified!')
      const { data } = await snagsApi.get(snagId)
      setSnag(data)
      setRemarks('')
    } catch {
      toast.error('Failed to submit rectification.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (approved: boolean, comments?: string) => {
    if (!snagId) return
    try {
      await snagsApi.verifyClose(snagId, { approved, comments })
      toast.success(`Snag ${approved ? 'closed' : 're-opened'}.`)
      const { data } = await snagsApi.get(snagId)
      setSnag(data)
    } catch {
      toast.error('Failed to verify snag.')
    }
  }

  if (!snag) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const isEngineerActionable =
    user?.role === 'engineer' && ['open', 'assigned', 'in_rectification'].includes(snag.status)
  const isQaActionable = user?.role === 'qa' && snag.status === 'rectified'

  return (
    <div className="pb-6">
      <Link
        to={ROUTES.DESNAGGING}
        className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
      >
        <ArrowLeft size={16} />
        Back to Snag List
      </Link>

      <div className="rounded-xl bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{snag.itemLabel}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Layers size={14} /> {snag.category}
              </span>
              <span className="flex items-center gap-1.5">
                <Tag size={14} /> Snag ID: {snag.id}
              </span>
            </div>
          </div>
          <Badge status={snag.status} className="mt-4 shrink-0 md:mt-0" />
        </div>

        <div className="my-6 overflow-x-auto">
          <SnagTimeline currentStatus={snag.status} />
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-base font-semibold text-slate-800">Description</h3>
            <p className="break-words text-sm text-slate-600">{snag.description}</p>
          </div>

          <ImageGrid title="Before Rectification" images={snag.beforeImages} onImageClick={setLightboxSrc} />

          {snag.afterImages.length > 0 && (
            <ImageGrid title="After Rectification" images={snag.afterImages} onImageClick={setLightboxSrc} />
          )}
        </div>
      </div>

      {isEngineerActionable && (
        <div className="mt-6">
          <RectificationForm
            remarks={remarks}
            onRemarksChange={setRemarks}
            onSubmit={handleRectify}
            loading={submitting}
          />
        </div>
      )}

      {isQaActionable && (
        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold">Verify Rectification</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={() => handleVerify(true)}>
              Verify & Close Snag
            </Button>
            <Button
              variant="danger"
              className="w-full sm:w-auto"
              onClick={() => handleVerify(false, 'Re-opened by QA.')}
            >
              Re-open Snag
            </Button>
          </div>
        </div>
      )}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
