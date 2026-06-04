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

export function Modal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  const visible = open ?? isOpen ?? false

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose?.()
    }
    onOpenChange?.(next)
  }

  return (
    <Dialog.Root open={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className={cn(
            'fixed z-50 max-h-[90vh] w-full overflow-y-auto border-t border-slate-200 bg-white shadow-xl outline-none',
            'bottom-0 left-0 right-0 rounded-t-2xl p-4 pb-safe',
            'md:bottom-auto md:left-1/2 md:top-1/2 md:w-[calc(100%-2rem)] md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border md:p-6',
            className
          )}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 md:hidden" />

          {title && (
            <Dialog.Title className="mb-4 pr-10 text-lg font-bold text-slate-900">
              {title}
            </Dialog.Title>
          )}

          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-3 top-3 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </Dialog.Close>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
