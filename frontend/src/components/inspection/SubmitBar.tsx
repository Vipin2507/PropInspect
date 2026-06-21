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
  const pending = totalCount !== undefined && doneCount !== undefined
    ? totalCount - doneCount
    : 0

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-30',
      'border-t border-slate-200 bg-white/95 px-4 py-3 pb-safe backdrop-blur-sm',
      'md:relative md:bottom-auto md:left-auto md:right-auto md:border-none md:bg-transparent md:p-0 md:mt-6'
    )}>
      <div className="mx-auto max-w-2xl space-y-2">
        {/* Soft warning — informs but never blocks */}
        {!isComplete && pending > 0 && (
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-600">
            <AlertCircle size={13} aria-hidden="true" />
            {pending} item{pending !== 1 ? 's' : ''} not yet evaluated — you can still proceed
          </p>
        )}

        {isLastCategory ? (
          <Button
            className="w-full"
            onClick={onSummary}
          >
            <CheckCircle size={20} aria-hidden="true" />
            {isComplete ? 'Go to Summary' : 'Go to Summary →'}
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={onNext}
          >
            Next Category
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
