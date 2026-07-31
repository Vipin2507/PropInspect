import { useState, useRef } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { bulkUploadApi } from '../utils/api'
import { Upload, Download, AlertTriangle, CheckCircle, FileSpreadsheet, X, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../utils/cn'

interface SkippedRow {
  row: number
  label: string
  reason: string
}

interface UploadResult {
  responsesUpdated: number
  flatsAffected: number
  skipped: SkippedRow[]
  unknownItems: string[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  onSuccess: () => void
}

const sectionLabel = 'text-[10px] font-semibold uppercase tracking-wide text-ink-400'

export function BulkStatusUploadModal({ open, onOpenChange, projectId, projectName, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setResult(null)
    setUploading(false)
  }

  const handleClose = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  const pickFile = (f: File | undefined | null) => {
    if (!f) return
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Only .xlsx or .xls files are accepted')
      return
    }
    setFile(f)
    setResult(null)
  }

  const downloadTemplate = async () => {
    setDownloading(true)
    try {
      const { data } = await bulkUploadApi.downloadTemplate(projectId)
      const url = URL.createObjectURL(new Blob([data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `checklist-${projectName.replace(/\s+/g, '-')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download template')
    } finally {
      setDownloading(false)
    }
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const { data } = await bulkUploadApi.uploadChecklist(projectId, file)
      setResult(data)
      if (data.flatsAffected > 0) {
        toast.success(`${data.flatsAffected} flat${data.flatsAffected !== 1 ? 's' : ''} updated`)
        onSuccess()
      } else {
        toast('No responses were updated', { icon: 'ℹ️' })
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={handleClose} title="Bulk Upload Checklist">
      <div className="space-y-3">
        <div className="flex gap-2 rounded-md border border-brand-200 bg-brand-50 p-2.5 text-xs text-brand-700">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Expected format</p>
            <p className="mt-0.5 text-brand-600/90">
              Row 1: &quot;Flat number&quot; | 106 | 107 | 108 …
              <br />
              Each item row: item label | Pass / N.A / (blank) per flat
            </p>
          </div>
        </div>

        <div className="rounded-md border border-ink-100 bg-ink-50/40 p-3">
          <p className={cn(sectionLabel, 'mb-1')}>Step 1 — Download template</p>
          <p className="mb-2.5 text-[11px] text-ink-500">
            Pre-filled with items &amp; current statuses for{' '}
            <span className="font-semibold text-ink-700">{projectName}</span>. Fill columns and
            re-upload.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            disabled={downloading}
            className="!min-h-[36px] !px-2.5 !py-1.5 text-xs gap-1.5"
          >
            {downloading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-300 border-t-transparent" />
            ) : (
              <Download size={13} aria-hidden="true" />
            )}
            Download Template (.xlsx)
          </Button>
        </div>

        <div>
          <p className={cn(sectionLabel, 'mb-1.5')}>Step 2 — Upload filled file</p>
          <div
            role="button"
            tabIndex={0}
            aria-label="Select Excel file"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pickFile(e.dataTransfer.files[0])
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-5 text-center transition-all duration-fast touch-manipulation',
              dragging
                ? 'border-brand-500 bg-brand-50'
                : 'border-ink-200 hover:border-brand-400 hover:bg-ink-50/60',
              file && !dragging && 'border-brand-300 bg-brand-50/50'
            )}
          >
            {file ? (
              <>
                <FileSpreadsheet size={24} className="text-brand-600" aria-hidden="true" />
                <p className="text-sm font-medium text-ink-800">{file.name}</p>
                <p className="text-[11px] text-ink-400">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setResult(null)
                  }}
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-danger-600 hover:underline"
                >
                  <X size={12} /> Remove
                </button>
              </>
            ) : (
              <>
                <Upload size={24} className="text-ink-300" aria-hidden="true" />
                <p className="text-sm font-medium text-ink-600">Drag &amp; drop or click to browse</p>
                <p className="text-[11px] text-ink-400">.xlsx or .xls · max 10 MB</p>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        {result && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 rounded-md border border-ink-100 bg-surface p-2.5 text-center shadow-xs">
              <div>
                <p
                  className={cn(
                    'font-display text-xl font-bold tabular',
                    result.flatsAffected > 0 ? 'text-success-600' : 'text-ink-300'
                  )}
                >
                  {result.flatsAffected}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Flats updated
                </p>
              </div>
              <div>
                <p
                  className={cn(
                    'font-display text-xl font-bold tabular',
                    result.responsesUpdated > 0 ? 'text-brand-600' : 'text-ink-300'
                  )}
                >
                  {result.responsesUpdated}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Responses
                </p>
              </div>
            </div>

            {result.flatsAffected > 0 && result.skipped.length === 0 && (
              <div className="flex items-center gap-2 rounded-md border border-success-600/20 bg-success-100 px-3 py-2 text-xs font-medium text-success-600">
                <CheckCircle size={14} aria-hidden="true" /> All rows processed successfully.
              </div>
            )}

            {(result.skipped.length > 0 || result.unknownItems.length > 0) && (
              <div className="rounded-md border border-warning-600/20 bg-warning-100 p-2.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning-600">
                  <AlertTriangle size={13} aria-hidden="true" />
                  {result.skipped.length} unrecognised item
                  {result.skipped.length !== 1 ? 's' : ''} skipped
                </div>
                <ul className="max-h-36 space-y-1 overflow-y-auto text-[11px] text-warning-600/90">
                  {result.skipped.map((s, i) => (
                    <li key={i}>
                      Row {s.row} · <span className="font-semibold">&quot;{s.label}&quot;</span> —{' '}
                      {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-0.5">
          <Button variant="outline" onClick={() => handleClose(false)} className="flex-1">
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={upload} disabled={!file || uploading} className="flex-1 gap-1.5">
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{' '}
                  Uploading…
                </>
              ) : (
                <>
                  <Upload size={14} aria-hidden="true" /> Upload &amp; Save
                </>
              )}
            </Button>
          )}
          {result && result.flatsAffected > 0 && (
            <Button onClick={reset} variant="outline" className="flex-1">
              Upload Another
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
