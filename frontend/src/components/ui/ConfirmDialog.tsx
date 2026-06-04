import { Modal } from './Modal'
import { Button } from './Button'

export function ConfirmDialog({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'primary',
}: {
  open?: boolean
  isOpen?: boolean
  onOpenChange?: (v: boolean) => void
  onClose?: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'primary' | 'danger' | 'secondary'
}) {
  const visible = open ?? isOpen ?? false

  const handleClose = () => {
    onClose?.()
    onOpenChange?.(false)
  }

  return (
    <Modal
      open={visible}
      onOpenChange={(v) => {
        if (!v) handleClose()
        else onOpenChange?.(v)
      }}
      title={title}
    >
      <p className="mb-6 text-slate-600">{message}</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={handleClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : variant === 'secondary' ? 'secondary' : 'primary'}
          onClick={() => {
            onConfirm()
            handleClose()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
