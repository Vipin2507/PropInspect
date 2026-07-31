import { Link } from 'react-router-dom'
import { ProgressBar } from '../ui/ProgressBar'
import { Card } from '../ui/Card'
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
            className="block"
          >
            <Card interactive className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink-800">{cat.name}</h3>
                  <p className="mt-0.5 text-caption text-ink-500">
                    {done} of {total} items checked
                  </p>
                </div>
                <ChevronRight className="shrink-0 text-ink-400" size={18} aria-hidden="true" />
              </div>
              <div className="mt-3">
                <ProgressBar pct={pct} />
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
