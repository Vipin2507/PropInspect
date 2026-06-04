import { AlertTriangle } from 'lucide-react'

export function RevisionBanner({ comments }: { comments: string }) {
  return (
    <div className="mb-4 flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <AlertTriangle className="shrink-0 text-secondary" />
      <div>
        <p className="font-semibold text-secondary-dark">Revision Required</p>
        <p className="mt-1 text-sm text-slate-600">{comments}</p>
      </div>
    </div>
  )
}
