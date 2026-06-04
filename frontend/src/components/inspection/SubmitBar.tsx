import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { ArrowRight, CheckCircle } from 'lucide-react';

export function SubmitBar({
  onNext,
  onSummary,
  isLastCategory,
  isComplete,
}: {
  onNext: () => void;
  onSummary: () => void;
  isLastCategory: boolean;
  isComplete: boolean;
}) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/90 p-3 backdrop-blur-sm',
        'pb-safe', // Safe area for notch phones
        'md:relative md:left-auto md:right-auto md:bottom-auto md:border-none md:bg-transparent md:p-0 md:mt-6'
      )}
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        {isLastCategory ? (
          <Button
            className="flex-1 h-12 text-base"
            onClick={onSummary}
            disabled={!isComplete}
            title={!isComplete ? 'Complete all items to proceed' : ''}
          >
            <CheckCircle size={20} className="mr-2" />
            Go to Summary
          </Button>
        ) : (
          <Button
            className="flex-1 h-12 text-base"
            onClick={onNext}
            disabled={!isComplete}
            title={!isComplete ? 'Complete all items to proceed' : ''}
          >
            Next Category
            <ArrowRight size={20} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
