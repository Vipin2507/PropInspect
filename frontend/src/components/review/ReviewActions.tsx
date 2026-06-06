import { Button } from '../ui/Button'
import { Check, MessageSquare, X } from 'lucide-react'

export function ReviewActions({
  onApprove,
  onRevision,
  onReject,
  isSubmitting,
}: {
  onApprove: () => void
  onRevision: () => void
  onReject: () => void
  isSubmitting?: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      <Button
        className="w-full min-h-[48px] bg-pass active:bg-green-700"
        onClick={onApprove}
        loading={isSubmitting}
      >
        <Check size={18} aria-hidden="true" />
        Approve
      </Button>
      <Button
        variant="outline"
        className="w-full min-h-[48px]"
        onClick={onRevision}
        loading={isSubmitting}
      >
        <MessageSquare size={18} aria-hidden="true" />
        Request Revision
      </Button>
      <Button
        variant="danger"
        className="w-full min-h-[48px]"
        onClick={onReject}
        loading={isSubmitting}
      >
        <X size={18} aria-hidden="true" />
        Reject
      </Button>
    </div>
  )
}
