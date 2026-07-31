export type UserRole = 'admin' | 'engineer' | 'qa' | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  mobile: string
  role: UserRole
  avatar?: string
  isActive: boolean
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
}

export interface Project {
  id: string
  name: string
  location: string
  developerName: string
  totalTowers: number
  status: 'active' | 'completed' | 'on_hold'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Tower {
  id: string
  projectId: string
  name: string
  totalFloors: number
  unitsPerFloor: number
  unitPrefix: string
  startNumber: number
  createdAt: string
}

export interface Floor {
  id: string
  towerId: string
  projectId: string
  floorNumber: number
  label: string
  flatCount?: number
}

export interface Flat {
  id: string
  towerId: string
  projectId: string
  floorId: string
  flatNumber: string
  floor: number
  status: FlatStatus
  createdAt: string
  towerName?: string
  floorLabel?: string
  completionPct?: number
  /** Engineer who last worked on this flat (from inspection record) */
  engineerName?: string | null
  /** Kept for backward compat but no longer populated by backend */
  assignment?: Assignment | null
  inspection?: {
    id: string
    status: string
    engineerId?: string
    engineerName?: string
    submittedAt?: string
    lastUpdated?: string
  } | null
  lastReview?: {
    qaId: string
    reviewerName: string
    decision: string
    reviewedAt: string
  } | null
  /** QA Changes Log — unreviewed engineer updates */
  unreviewedChangeCount?: number
  inspectionId?: string | null
  submittedAt?: string | null
}

export type FlatStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_required'
  | 'desnagging'
  | 'handed_over'

export interface Assignment {
  id: string
  flatId: string
  engineerId: string
  qaId: string
  assignedBy: string
  assignedAt: string
  engineerName?: string
  qaName?: string
}

export interface ChecklistTemplateItem {
  id: string
  categoryId: string
  label: string
  description?: string
  isMandatoryImage: boolean
  sortOrder: number
}

export interface ChecklistCategory {
  id: string
  templateId: string
  name: string
  icon: string
  sortOrder: number
  items: ChecklistTemplateItem[]
}

export interface ChecklistTemplate {
  id: string
  name: string
  categories: ChecklistCategory[]
  isDefault: boolean
  createdBy: string
  createdAt: string
}

export type ResponseStatus = 'pass' | 'fail' | 'na' | 'pending'

export interface InspectionResponse {
  id: string
  inspectionId: string
  itemId: string
  categoryId: string
  status: ResponseStatus
  remarks: string
  qaRemarks: string
  qaDecision?: 'approved' | 'rejected' | 'revision_required'
  images: SnagImage[]
  snagId?: string
  updatedAt: string
}

export type InspectionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_required'

export interface Inspection {
  id: string
  flatId: string
  projectId: string
  towerId: string
  floorId: string
  engineerId: string
  templateId: string
  responses: InspectionResponse[]
  status: InspectionStatus
  submittedAt?: string
  lastUpdated: string
  syncedAt?: string
  totalItems?: number
  completedCount?: number
  pendingCount?: number
  passCount?: number
  failCount?: number
  naCount?: number
  completionPct?: number
}

export type SnagStatus =
  | 'open'
  | 'assigned'
  | 'in_rectification'
  | 'rectified'
  | 'verified'
  | 'closed'
  | 'rejected'

export type SnagSeverity = 'critical' | 'major' | 'minor'

export interface Snag {
  id: string
  inspectionId: string
  responseId: string
  flatId: string
  projectId: string
  category: string
  itemLabel: string
  description: string
  severity: SnagSeverity
  status: SnagStatus
  assignedTo?: string
  beforeImages: SnagImage[]
  afterImages: SnagImage[]
  remarks: string
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface SnagImage {
  id: string
  inspectionId: string
  snagId?: string
  responseId?: string
  itemId?: string
  type: 'before' | 'after' | 'evidence'
  url: string
  thumbnailUrl?: string
  caption: string
  uploadedAt: string
  syncedAt?: string
  isLocal?: boolean
  localBlob?: string
}

export type ReviewDecision = 'approved' | 'rejected' | 'revision_required'

export interface Review {
  id: string
  inspectionId: string
  flatId: string
  qaId: string
  decision: ReviewDecision
  overallComments: string
  itemComments: Record<string, string>
  reviewedAt: string
}

export type NotificationType =
  | 'inspection_submitted'
  | 'inspection_started'
  | 'inspection_resumed'
  | 'inspection_approved'
  | 'inspection_rejected'
  | 'revision_required'
  | 'qa_review_started'
  | 'qa_review_resumed'
  | 'qa_task_revision'
  | 'qa_task_rejected'
  | 'flat_completion'
  | 'snag_assigned'
  | 'snag_rectified'
  | 'overdue_reminder'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedId: string
  isRead: boolean
  createdAt: string
}

export interface ActivityEntry {
  activityType: 'inspection_update' | 'review'
  userId: string
  userName: string
  userRole: string
  inspectionId: string
  inspectionStatus: string
  flatNumber: string
  towerName: string
  projectName: string
  activityAt: string
  comments?: string
}

export type FlatHistoryEventType =
  | 'inspection_started'
  | 'inspection_submitted'
  | 'inspection_resubmitted'
  | 'inspection_resumed'
  | 'review_approved'
  | 'review_rejected'
  | 'review_revision_required'
  | 'qa_review_started'
  | 'qa_review_resumed'
  | 'qa_task_revision'
  | 'qa_task_rejected'
  | 'qa_task_approved'
  | 'handed_over'
  | 'engineer_assigned'
  | 'status_changed'

export interface FlatHistoryEntry {
  id: string
  flatId: string
  eventType: FlatHistoryEventType
  actorId?: string
  actorName?: string
  actorRole?: string
  title: string
  description: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type PendingChangeType =
  | 'save_inspection'
  | 'submit_inspection'
  | 'resubmit_inspection'
  | 'review_decision'
  | 'upload_image'
  | 'create_snag'
  | 'update_snag'
  | 'qa_decision'

export interface PendingChange {
  id: string
  type: PendingChangeType
  payload: unknown
  timestamp: number
  retries: number
}

export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface ProjectStats {
  projectId: string
  projectName: string
  totalFlats: number
  notStarted: number
  inProgress: number
  submitted: number
  approved: number
  rejected: number
  revisionRequired: number
  desnagging: number
  handedOver: number
  openSnags: number
  closedSnags: number
  completionPct: number
}

export interface TowerStats extends ProjectStats {
  towerId: string
  towerName: string
}

export interface EngineerStats {
  engineerId: string
  name: string
  assigned: number
  submitted: number
  approved: number
  rejected: number
  avgCompletionTime?: number
}

export interface SnagSummary {
  open: number
  inRectification: number
  rectified: number
  closed: number
  bySeverity: { critical: number; major: number; minor: number }
}

export interface DashboardData {
  projectStats: ProjectStats[]
  snagSummary: SnagSummary
  recentSubmissions: Array<{
    flatNumber: string
    towerName: string
    engineerName: string
    submittedAt: string
    status: InspectionStatus
  }>
  engineerLeaderboard: EngineerStats[]
}

export type TaskChangeType = 'status_change' | 'remarks_change'

export interface TaskChangeLogEntry {
  id: string
  flatId: string
  inspectionId: string
  responseId: string
  itemId: string
  categoryId: string
  itemLabel: string
  categoryName: string
  flatNumber: string
  towerName: string
  projectId: string
  changeType: TaskChangeType
  oldValue: string
  newValue: string
  engineerId: string
  engineerName: string
  reviewedAt: string | null
  reviewedBy: string | null
  reviewerName: string | null
  createdAt: string
}

export interface FlatChangeGroup {
  flatId: string
  flatNumber: string
  towerName: string
  projectId: string
  engineerName: string
  flatStatus: string
  completionPct: number
  unreviewedCount: number
  lastChangeAt: string
  changes: TaskChangeLogEntry[]
}

export type EngineerFeedbackType = 'revision_required' | 'rejected' | 'approved'

export interface EngineerFeedbackEntry {
  id: string
  flatId: string
  inspectionId: string
  responseId: string
  itemId: string
  itemLabel: string
  categoryName: string
  flatNumber: string
  towerName: string
  projectId: string
  engineerId: string
  qaId: string
  qaName: string
  feedbackType: EngineerFeedbackType
  remark: string
  seenAt: string | null
  createdAt: string
}

export interface EngineerFeedbackGroup {
  flatId: string
  flatNumber: string
  towerName: string
  projectId: string
  qaName: string
  flatStatus: string
  completionPct: number
  unseenCount: number
  lastFeedbackAt: string
  feedback: EngineerFeedbackEntry[]
}
