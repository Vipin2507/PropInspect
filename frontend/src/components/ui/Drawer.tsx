import { cn } from '../../utils/cn'
import { X } from 'lucide-react'

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'bottom',
}: {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  side?: 'left' | 'right' | 'bottom'
}) {
  const isBottom = side === 'bottom'

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300',
          isBottom
            ? 'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-3xl'
            : 'top-0 h-full w-full max-w-xs',
          side === 'right' && 'right-0',
          side === 'left'  && 'left-0',
          isOpen
            ? 'translate-y-0 translate-x-0'
            : isBottom
              ? 'translate-y-full'
              : side === 'right'
                ? 'translate-x-full'
                : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle */}
        {isBottom && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1.5 w-10 rounded-full bg-slate-300" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-500 active:bg-slate-100 touch-manipulation"
              aria-label="Close"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-safe">
          {children}
        </div>
      </div>
    </>
  )
}
