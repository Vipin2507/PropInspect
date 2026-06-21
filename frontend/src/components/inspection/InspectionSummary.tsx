import { Link } from 'react-router-dom'
import { ProgressBar } from '../ui/ProgressBar'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import type { InspectionResponse } from '../../types'
import { ChevronRight } from 'lucide-react'
import { ROUTES } from '../../constants/routes'

export function InspectionSummary({
  responses,
  flatId,
}: {
  responses: InspectionResponse[]
  flatId: string
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {DEFAULT_CHECKLIST_CATEGORIES.map((cat) => {
        const catResponses = responses.filter((r) => r.categoryId === cat.id)
        const done  = catResponses.filter((r) => r.status !== 'pending').length
        const total = cat.items.length
        const pct   = total > 0 ? Math.round((done / total) * 100) : 0

        return (
          <Link
            key={cat.id}
            to={ROUTES.ENGINEER_CHECKLIST(flatId, cat.id)}
            className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-800">{cat.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {done} of {total} items checked
                </p>
              </div>
              <ChevronRight className="shrink-0 text-slate-400" size={18} aria-hidden="true" />
            </div>
            <div className="mt-3">
              <ProgressBar pct={pct} />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
