import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { ArrowRight, CheckCircle } from 'lucide-react'

export function SubmitBar({
  onNext,
  onSummary,
  isLastCategory,
  isComplete,
}: {
  onNext: () => void
  onSummary: () => void
  isLastCategory: boolean
  isComplete: boolean
}) {
  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-30',
      'border-t border-slate-200 bg-white/95 px-4 py-3 pb-safe backdrop-blur-sm',
      'md:relative md:bottom-auto md:left-auto md:right-auto md:border-none md:bg-transparent md:p-0 md:mt-6'
    )}>
      <div className="mx-auto max-w-2xl">
        {isLastCategory ? (
          <Button
            className="w-full"
            onClick={onSummary}
            disabled={!isComplete}
            title={!isComplete ? 'Complete all items first' : undefined}
          >
            <CheckCircle size={20} aria-hidden="true" />
            Go to Summary
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={onNext}
            disabled={!isComplete}
            title={!isComplete ? 'Complete all items first' : undefined}
          >
            Next Category
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
