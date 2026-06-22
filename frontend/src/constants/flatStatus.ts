import type { FlatStatus } from '../types'

export const FLAT_STATUS_OPTIONS: { value: FlatStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted for Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'revision_required', label: 'Revision Required' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'desnagging', label: 'Desnagging' },
  { value: 'handed_over', label: 'Handed Over to Client' },
]

export const FLAT_STATUS_LABEL: Record<FlatStatus, string> = Object.fromEntries(
  FLAT_STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<FlatStatus, string>
