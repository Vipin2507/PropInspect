import { cn } from '../../utils/cn'
import type { SnagStatus } from '../../types'
import { Check } from 'lucide-react'

const STEPS: { status: SnagStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'assigned', label: 'Assigned' },
  { status: 'in_rectification', label: 'In Rectification' },
  { status: 'rectified', label: 'Rectified' },
  { status: 'closed', label: 'Closed' },
]

const STATUS_ORDER: SnagStatus[] = [
  'open',
  'assigned',
  'in_rectification',
  'rectified',
  'closed',
]

export function SnagTimeline({ currentStatus }: { currentStatus: SnagStatus }) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus)

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold mb-4">Status History</h3>
      <div className="relative flex justify-between">
        {/* Timeline line */}
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-slate-200">
          <div
            className="h-full bg-pass transition-all duration-500"
            style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step, i) => {
          const isCompleted = i <= currentIndex
          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-300',
                  isCompleted
                    ? 'border-pass bg-pass text-white'
                    : 'border-slate-300 bg-white text-slate-400'
                )}
              >
                {isCompleted && <Check size={14} strokeWidth={3} />}
              </div>
              <span
                className={cn(
                  'mt-2 text-center text-xs font-semibold',
                  isCompleted ? 'text-slate-700' : 'text-slate-500'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
