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
    // Always 3 columns — icon-only on very small screens, icon+text on wider
    <div className="grid grid-cols-3 gap-2">
      <Button
        className="w-full bg-pass active:bg-green-700 px-2"
        onClick={onApprove}
        loading={isSubmitting}
        aria-label="Approve"
      >
        <Check size={18} aria-hidden="true" />
        <span className="hidden xs:inline">Approve</span>
      </Button>

      <Button
        variant="outline"
        className="w-full px-2"
        onClick={onRevision}
        loading={isSubmitting}
        aria-label="Request Revision"
      >
        <MessageSquare size={18} aria-hidden="true" />
        <span className="hidden xs:inline">Revise</span>
      </Button>

      <Button
        variant="danger"
        className="w-full px-2"
        onClick={onReject}
        loading={isSubmitting}
        aria-label="Reject"
      >
        <X size={18} aria-hidden="true" />
        <span className="hidden xs:inline">Reject</span>
      </Button>
    </div>
  )
}
