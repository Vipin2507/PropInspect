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
        const done = catResponses.filter((r) => r.status !== 'pending').length
        const total = cat.items.length
        const pct = total > 0 ? Math.round((done / total) * 100) : 0

        return (
          <Link
            key={cat.id}
            to={ROUTES.ENGINEER_CHECKLIST(flatId, cat.id)}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all active:scale-[0.99] [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{cat.name}</h3>
                <p className="text-sm text-slate-500">
                  {done} of {total} items checked
                </p>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
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
