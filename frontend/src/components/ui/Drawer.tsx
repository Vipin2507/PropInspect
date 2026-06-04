import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'bottom',
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right' | 'bottom';
}) {
  const isBottom = side === 'bottom';

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-white shadow-xl transition-transform',
          isBottom
            ? 'inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl'
            : 'top-0 h-full w-full max-w-xs',
          side === 'right' && 'right-0',
          side === 'left' && 'left-0',
          isOpen
            ? 'translate-y-0 translate-x-0'
            : {
                bottom: 'translate-y-full',
                right: 'translate-x-full',
                left: '-translate-x-full',
              }[side]
        )}
        role="dialog"
        aria-modal="true"
      >
        {isBottom && (
          <div className="flex justify-center pt-3">
            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>
        )}
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 pb-safe">{children}</div>
      </div>
    </>
  );
}
