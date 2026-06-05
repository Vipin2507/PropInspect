import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

type ModalProps = {
  title?: string
  children: React.ReactNode
  className?: string
  open?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
}

export function Modal({ open, isOpen, onOpenChange, onClose, title, children, className }: ModalProps) {
  const visible = open ?? isOpen ?? false

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose?.()
    onOpenChange?.(next)
  }

  return (
    <Dialog.Root open={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 transition-opacity" />
        <Dialog.Content
          className={cn(
            // Mobile: full-width bottom sheet
            'fixed z-50 w-full bg-white shadow-2xl outline-none',
            'bottom-0 left-0 right-0 rounded-t-3xl',
            'max-h-[92dvh] overflow-y-auto overscroll-contain',
            'px-5 pt-3 pb-safe',
            // Desktop: centered dialog
            'md:bottom-auto md:left-1/2 md:top-1/2 md:w-[calc(100%-2rem)] md:max-w-lg',
            'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:px-6 md:py-6',
            className
          )}
        >
          {/* Drag handle (mobile only) */}
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 md:hidden" />

          {title && (
            <Dialog.Title className="mb-5 pr-10 text-lg font-bold text-slate-900">
              {title}
            </Dialog.Title>
          )}

          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
              aria-label="Close"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </Dialog.Close>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
