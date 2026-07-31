import { useState } from 'react'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import { ReviewItemRow } from './ReviewItemRow'
import type { InspectionResponse } from '../../types'
import * as Icons from 'lucide-react'
import { Card } from '../ui/Card'
import { cn } from '../../utils/cn'

/** Show every task the engineer has evaluated — Checker reviews each separately. */
function isReviewable(r: InspectionResponse): boolean {
  return r.status !== 'pending'
}

export function ReviewChecklist({
  responses,
  inspectionId,
  itemComments,
  onItemCommentChange,
  onResponseUpdate,
  onImageClick,
  readOnly = false,
  taskReviewOnly = false,
}: {
  responses: InspectionResponse[]
  inspectionId: string
  itemComments: Record<string, string>
  onItemCommentChange: (itemId: string, v: string) => void
  onResponseUpdate?: (responseId: string, updated: Partial<InspectionResponse>) => void
  onImageClick: (url: string) => void
  readOnly?: boolean
  /** In-progress review: per-task decisions only, no evidence upload */
  taskReviewOnly?: boolean
}) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => {
    // Pre-expand categories that have fail items
    const withFails = new Set<string>()
    for (const r of responses) {
      if (r.status === 'fail') withFails.add(r.categoryId)
    }
    return withFails
  })

  const toggleCat = (catId: string) =>
    setExpandedCats((prev) => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })

  // Build summary counts per category
  const catStats = new Map<string, { total: number; fail: number; reviewable: number }>()
  for (const r of responses) {
    if (!catStats.has(r.categoryId)) catStats.set(r.categoryId, { total: 0, fail: 0, reviewable: 0 })
    const s = catStats.get(r.categoryId)!
    s.total++
    if (r.status === 'fail') s.fail++
    if (isReviewable(r)) s.reviewable++
  }

  return (
    <div className="space-y-3">
      {DEFAULT_CHECKLIST_CATEGORIES.map((cat) => {
        const Icon = (Icons as any)[cat.icon] || Icons.HelpCircle
        const stats = catStats.get(cat.id)

        // Show categories that have at least one evaluated task
        if (!stats || stats.reviewable === 0) return null

        const reviewableItems = cat.items
          .map((item) => ({
            item,
            response: responses.find((r) => r.itemId === item.id),
          }))
          .filter(({ response }) => response && isReviewable(response))

        const isExpanded = expandedCats.has(cat.id)
        const hasFails = stats.fail > 0

        return (
          <Card
            key={cat.id}
            className={cn(
              'overflow-hidden',
              hasFails && 'border-danger-600/20'
            )}
          >
            {/* Category header — always visible, tappable to expand/collapse */}
            <button
              type="button"
              onClick={() => toggleCat(cat.id)}
              className="flex w-full items-center gap-3 p-4 text-left touch-manipulation transition-colors active:bg-ink-50"
            >
              <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                hasFails ? 'bg-danger-100 text-danger-600' : 'bg-brand-100 text-brand-600'
              )}>
                <Icon size={18} aria-hidden="true" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink-900">{cat.name}</p>
                <p className="text-xs text-ink-500 mt-0.5">
                  {stats.total} items evaluated
                  {hasFails && (
                    <span className="ml-2 font-semibold text-danger-600">
                      · {stats.fail} fail{stats.fail !== 1 ? 's' : ''}
                    </span>
                  )}
                  {reviewableItems.length === 0 && (
                    <span className="ml-2 text-ink-400">· nothing to review</span>
                  )}
                </p>
              </div>

              {/* Expand/collapse chevron */}
              <Icons.ChevronDown
                size={18}
                className={cn(
                  'shrink-0 text-ink-400 transition-transform',
                  isExpanded && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </button>

            {/* Reviewable items — only shown when expanded */}
            {isExpanded && (
              <div className="border-t border-ink-100 px-4 pb-3 pt-1">
                {reviewableItems.length === 0 ? (
                  <p className="py-4 text-center text-sm text-ink-400">
                    All items passed with no remarks or photos.
                  </p>
                ) : (
                  <div className="space-y-2 pt-2">
                    {reviewableItems.map(({ item, response }, i) => (
                      <ReviewItemRow
                        key={item.id}
                        index={i + 1}
                        label={item.label}
                        response={response!}
                        inspectionId={inspectionId}
                        onResponseUpdate={(updated) => onResponseUpdate?.(response!.id, updated)}
                        qaComment={itemComments[item.id] || response!.qaRemarks || ''}
                        onQaComment={(v) => onItemCommentChange(item.id, v)}
                        readOnly={readOnly}
                        taskReviewOnly={taskReviewOnly}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
