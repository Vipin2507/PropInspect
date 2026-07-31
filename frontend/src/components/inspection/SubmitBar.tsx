import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'

export function SubmitBar({
  onNext,
  onSummary,
  isLastCategory,
  isComplete,
  doneCount,
  totalCount,
}: {
  onNext: () => void
  onSummary: () => void
  isLastCategory: boolean
  isComplete: boolean
  doneCount?: number
  totalCount?: number
}) {
  const pending =
    totalCount !== undefined && doneCount !== undefined ? totalCount - doneCount : 0

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30',
        'border-t border-ink-100 bg-surface/95 px-3 py-2.5 pb-safe backdrop-blur-sm',
        'md:relative md:bottom-auto md:left-auto md:right-auto md:mt-4 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none'
      )}
    >
      <div className="mx-auto max-w-2xl space-y-1.5">
        {!isComplete && pending > 0 && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-warning-600">
            <AlertCircle size={12} aria-hidden="true" />
            {pending} of {totalCount} tasks not yet evaluated
          </p>
        )}

        {isLastCategory ? (
          <Button
            size="sm"
            className="w-full !min-h-[40px] text-sm"
            onClick={onSummary}
          >
            <CheckCircle size={16} aria-hidden="true" />
            Go to Summary
          </Button>
        ) : (
          <Button size="sm" className="w-full !min-h-[40px] text-sm" onClick={onNext}>
            Next Category
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
