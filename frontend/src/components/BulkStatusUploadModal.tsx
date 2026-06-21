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

export function BulkStatusUploadModal({ open, onOpenChange, projectId, projectName, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => { setFile(null); setResult(null); setUploading(false) }

  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v) }

  const pickFile = (f: File | undefined | null) => {
    if (!f) return
    if (!f.name.match(/\.(xlsx|xls)$/i)) { toast.error('Only .xlsx or .xls files are accepted'); return }
    setFile(f); setResult(null)
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
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={handleClose} title="Bulk Upload Checklist">
      <div className="space-y-4">

        {/* Format info */}
        <div className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Expected format</p>
            <p className="mt-0.5 text-blue-600">
              Row 1: "Flat number" | 106 | 107 | 108 …<br />
              Each item row: item label | Pass / N.A / (blank) per flat
            </p>
          </div>
        </div>

        {/* Step 1 */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-sm font-semibold text-slate-700">Step 1 — Download template</p>
          <p className="mb-3 text-xs text-slate-500">
            Pre-filled with all items &amp; current statuses for{' '}
            <span className="font-medium">{projectName}</span>. Fill in each flat column and re-upload.
          </p>
          <Button variant="outline" size="sm" onClick={downloadTemplate} disabled={downloading} className="gap-2">
            {downloading
              ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              : <Download size={14} aria-hidden="true" />
            }
            Download Template (.xlsx)
          </Button>
        </div>

        {/* Step 2 */}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Step 2 — Upload filled file</p>
          <div
            role="button"
            tabIndex={0}
            aria-label="Select Excel file"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
              dragging     ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50',
              file && !dragging && 'border-primary/40 bg-primary/5'
            )}
          >
            {file ? (
              <>
                <FileSpreadsheet size={28} className="text-primary" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
                  className="mt-1 flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"
                >
                  <X size={12} /> Remove
                </button>
              </>
            ) : (
              <>
                <Upload size={28} className="text-slate-400" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-600">Drag &amp; drop or click to browse</p>
                <p className="text-xs text-slate-400">.xlsx or .xls · max 10 MB</p>
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

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div>
                <p className={cn('text-xl font-bold', result.flatsAffected > 0 ? 'text-green-600' : 'text-slate-400')}>
                  {result.flatsAffected}
                </p>
                <p className="text-xs text-slate-500">Flats updated</p>
              </div>
              <div>
                <p className={cn('text-xl font-bold', result.responsesUpdated > 0 ? 'text-primary' : 'text-slate-400')}>
                  {result.responsesUpdated}
                </p>
                <p className="text-xs text-slate-500">Responses saved</p>
              </div>
            </div>

            {result.flatsAffected > 0 && result.skipped.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle size={15} aria-hidden="true" /> All rows processed successfully.
              </div>
            )}

            {(result.skipped.length > 0 || result.unknownItems.length > 0) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                  <AlertTriangle size={14} aria-hidden="true" />
                  {result.skipped.length} unrecognised item{result.skipped.length !== 1 ? 's' : ''} skipped
                </div>
                <ul className="max-h-36 space-y-1 overflow-y-auto text-xs text-amber-800">
                  {result.skipped.map((s, i) => (
                    <li key={i}>Row {s.row} · <span className="font-medium">"{s.label}"</span> — {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={() => handleClose(false)} className="flex-1">
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={upload} disabled={!file || uploading} className="flex-1 gap-2">
              {uploading
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Uploading…</>
                : <><Upload size={14} aria-hidden="true" /> Upload &amp; Save</>
              }
            </Button>
          )}
          {result && result.flatsAffected > 0 && (
            <Button onClick={reset} variant="outline" className="flex-1">Upload Another</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
