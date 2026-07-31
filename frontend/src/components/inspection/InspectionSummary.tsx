import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ProgressBar } from '../ui/ProgressBar'
import { Card } from '../ui/Card'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import type { InspectionResponse } from '../../types'
import { ChevronRight } from 'lucide-react'
import { ROUTES } from '../../constants/routes'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'

export function InspectionSummary({
  responses,
  flatId,
}: {
  responses: InspectionResponse[]
  flatId: string
}) {
  const { reduced, stagger } = useMotionSafe()

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {DEFAULT_CHECKLIST_CATEGORIES.map((cat, i) => {
        const catResponses = responses.filter((r) => r.categoryId === cat.id)
        const done = catResponses.filter((r) => r.status !== 'pending').length
        const total = cat.items.length
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        const complete = done === total && total > 0

        return (
          <motion.div
            key={cat.id}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(i)}
          >
            <Link to={ROUTES.ENGINEER_CHECKLIST(flatId, cat.id)} className="block touch-manipulation">
              <Card
                className={cn(
                  'group p-3 shadow-xs transition-all duration-fast',
                  'hover:border-brand-200 hover:shadow-sm active:scale-[0.99]',
                  complete && 'border-success-600/20 bg-success-50/30'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-ink-950">{cat.name}</h3>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {done} of {total} items
                    </p>
                  </div>
                  <ChevronRight
                    className="shrink-0 text-ink-300 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-brand-500"
                    size={16}
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-2">
                  <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                    <span>Progress</span>
                    <span className={cn('tabular', complete ? 'text-success-600' : 'text-ink-600')}>
                      {pct}%
                    </span>
                  </div>
                  <ProgressBar pct={pct} />
                </div>
              </Card>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
