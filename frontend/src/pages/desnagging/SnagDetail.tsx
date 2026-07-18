import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { snagsApi } from '../../utils/api'
import { getDb } from '../../utils/db'
import { resolveImageOffline, cacheSnagImages } from '../../utils/imageCache'
import { queueChange } from '../../utils/sync'
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

/** Single image thumbnail with offline fallback via IndexedDB */
function OfflineThumb({ img, onClick }: { img: SnagImage; onClick: (src: string) => void }) {
  const initial = img.localBlob || img.thumbnailUrl || img.url
  const [src, setSrc] = useState<string | undefined>(initial)

  useEffect(() => {
    if (img.localBlob) return
    const urlToCheck = img.thumbnailUrl || img.url
    if (!urlToCheck) return
    resolveImageOffline(urlToCheck).then((r) => { if (r) setSrc(r) })
  }, [img.localBlob, img.thumbnailUrl, img.url])

  const handleClick = async () => {
    const fullUrl = img.localBlob || img.url
    const resolved = await resolveImageOffline(fullUrl) ?? fullUrl
    onClick(resolved)
  }

  if (!src) return null
  return (
    <button
      type="button"
      onClick={handleClick}
      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 active:scale-95 transition-transform sm:h-24 sm:w-24"
    >
      <img src={src} alt={img.caption || 'Photo'} className="h-full w-full object-cover" />
    </button>
  )
}

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
          <OfflineThumb key={img.id} img={img} onClick={onImageClick} />
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
    if (!snagId) return
    ;(async () => {
      // Serve from IndexedDB cache first
      const db = await getDb()
      const cached = await db.get('snags', snagId) as unknown as Snag | undefined
      if (cached) setSnag(cached)
      // Network refresh
      try {
        const { data } = await snagsApi.get(snagId)
        await db.put('snags', data as unknown as Record<string, unknown>)
        cacheSnagImages(data)
        setSnag(data)
      } catch { /* stay with cached */ }
    })()
  }, [snagId])

  const handleRectify = async () => {
    if (!snagId || !remarks.trim()) { toast.error('Remarks are required'); return }
    setSubmitting(true)
    try {
      await snagsApi.rectify(snagId, { remarks })
      toast.success('Snag marked as rectified!')
      const { data } = await snagsApi.get(snagId)
      const db = await getDb()
      await db.put('snags', data as unknown as Record<string, unknown>)
      setSnag(data)
      setRemarks('')
    } catch {
      // Queue for when back online — update local cache optimistically
      await queueChange('update_snag', { snagId, changes: { status: 'in_rectification', remarks } })
      setSnag((prev) => {
        if (!prev) return prev
        const next = { ...prev, status: 'in_rectification' as const, remarks }
        void getDb().then((db) => db.put('snags', next as unknown as Record<string, unknown>))
        return next
      })
      setRemarks('')
      toast.success('Saved offline — will sync when back online')
    }
    finally { setSubmitting(false) }
  }

  const handleVerify = async (approved: boolean, comments?: string) => {
    if (!snagId) return
    try {
      await snagsApi.verifyClose(snagId, { approved, comments })
      toast.success(approved ? 'Snag closed.' : 'Snag re-opened.')
      const { data } = await snagsApi.get(snagId)
      const db = await getDb()
      await db.put('snags', data as unknown as Record<string, unknown>)
      setSnag(data)
    } catch {
      const newStatus = approved ? 'closed' : 'open'
      await queueChange('update_snag', { snagId, changes: { status: newStatus, remarks: comments ?? '' } })
      setSnag((prev) => {
        if (!prev) return prev
        const next = { ...prev, status: newStatus as typeof prev.status }
        void getDb().then((db) => db.put('snags', next as unknown as Record<string, unknown>))
        return next
      })
      toast.success('Saved offline — will sync when back online')
    }
  }

  if (!snag) {
    return <div className="flex flex-1 items-center justify-center py-24"><Spinner size="lg" /></div>
  }

  const isEngineerActionable =
    user?.role === 'engineer' && ['open', 'assigned', 'in_rectification'].includes(snag.status)
  const isQaActionable = user?.role === 'qa' && snag.status === 'rectified'

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Link
        to={ROUTES.DESNAGGING}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Snag List
      </Link>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{snag.itemLabel}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Layers size={14} /> {snag.category}</span>
              <span className="flex items-center gap-1.5">
                <Tag size={14} />
                <span className="font-mono text-xs">{snag.id.slice(0, 8)}…</span>
              </span>
            </div>
          </div>
          <Badge status={snag.status} className="self-start" />
        </div>

        <div className="my-6 overflow-x-auto">
          <SnagTimeline currentStatus={snag.status} />
        </div>

        <div className="space-y-5">
          {snag.description && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Description</h3>
              <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                {snag.description}
              </p>
            </div>
          )}
          <ImageGrid title="Before Rectification" images={snag.beforeImages} onImageClick={setLightboxSrc} />
          {snag.afterImages.length > 0 && (
            <ImageGrid title="After Rectification" images={snag.afterImages} onImageClick={setLightboxSrc} />
          )}
        </div>
      </div>

      {isEngineerActionable && (
        <RectificationForm remarks={remarks} onRemarksChange={setRemarks} onSubmit={handleRectify} loading={submitting} />
      )}

      {isQaActionable && (
        <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Verify Rectification</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={() => handleVerify(true)}>
              Verify &amp; Close Snag
            </Button>
            <Button variant="danger" className="w-full sm:w-auto" onClick={() => handleVerify(false, 'Re-opened by QA.')}>
              Re-open Snag
            </Button>
          </div>
        </div>
      )}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
