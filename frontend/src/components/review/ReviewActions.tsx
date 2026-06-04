import { Button } from '../ui/Button';
import { Check, MessageSquare, X } from 'lucide-react';

export function ReviewActions({
  onApprove,
  onRevision,
  onReject,
  isSubmitting,
}: {
  onApprove: () => void;
  onRevision: () => void;
  onReject: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Button
        className="h-12 bg-green-600 hover:bg-green-700"
        onClick={onApprove}
        loading={isSubmitting}
      >
        <Check size={20} className="mr-2" />
        Approve
      </Button>
      <Button
        variant="secondary"
        className="h-12"
        onClick={onRevision}
        loading={isSubmitting}
      >
        <MessageSquare size={20} className="mr-2" />
        Request Revision
      </Button>
      <Button
        variant="danger"
        className="h-12"
        onClick={onReject}
        loading={isSubmitting}
      >
        <X size={20} className="mr-2" />
        Reject
      </Button>
    </div>
  );
}
