import axios from 'axios'
import { Capacitor } from '@capacitor/core'
import type {
  User,
  Project,
  Tower,
  Floor,
  Flat,
  Inspection,
  Snag,
  Notification,
  DashboardData,
  ActivityEntry,
  Assignment,
  ChecklistTemplate,
  Review,
} from '../types'

const getBaseURL = () => {
  if (Capacitor.isNativePlatform()) {
    return 'https://147.93.30.96/api'; // VPS behind Nginx HTTPS proxy
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
};

// Base URL for static media (uploads). Relative paths from the server
// need to be prefixed with the VPS host when running as a native app,
// because capacitor://localhost cannot resolve /uploads/... paths.
export const getMediaBaseURL = () => {
  if (Capacitor.isNativePlatform()) {
    return 'http://147.93.30.96';
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  return apiBase.replace(/\/api$/, '');
};

// Resolve a relative server path like /uploads/... to a full URL on native.
export function resolveMediaUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return `${getMediaBaseURL()}${url}`;
}

export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('snagdesk_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/login', { email, password }),
  me: () => api.get<{ user: User }>('/auth/me'),
  updateProfile: (data: { name?: string; email?: string; mobile?: string; newPassword?: string }) =>
    api.patch<{ user: User }>('/auth/profile', data),
  sendOtp: (mobile: string) => api.post<{ otp?: string }>('/auth/otp/send', { mobile }),
  verifyOtp: (mobile: string, otp: string) =>
    api.post<{ user: User; token: string }>('/auth/otp/verify', { mobile, otp }),
}

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: { name: string; location?: string; developerName?: string }) =>
    api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  stats: (id: string) => api.get(`/projects/${id}/stats`),
}

export const towersApi = {
  list: (projectId: string) => api.get<Tower[]>(`/towers?projectId=${projectId}`),
  create: (data: {
    projectId: string
    name: string
    totalFloors: number
    unitsPerFloor: number
    unitPrefix: string
    startNumber: number
  }) => api.post('/towers', data),
  update: (id: string, data: Partial<{ name: string }>) => api.put<Tower>(`/towers/${id}`, data),
  delete: (id: string) => api.delete(`/towers/${id}`),
}

export const floorsApi = {
  list: (towerId: string) => api.get<Floor[]>(`/floors?towerId=${towerId}`),
}

export const flatsApi = {
  byEngineer: (engineerId: string) => api.get<Flat[]>(`/flats?engineerId=${engineerId}`),
  byProject: (projectId: string) => api.get<Flat[]>(`/flats?projectId=${projectId}`),
  byTower: (towerId: string) => api.get<Flat[]>(`/flats?towerId=${towerId}`),
  get: (id: string) => api.get<Flat>(`/flats/${id}`),
  checkerList: (params?: { projectId?: string; towerId?: string }) =>
    api.get<Flat[]>('/flats/checker', { params }),
  setStatus: (id: string, status: string) =>
    api.patch<Flat>(`/flats/${id}/status`, { status }),
  handover: (id: string) =>
    api.post<Flat>(`/flats/${id}/handover`),
}

export const inspectionsApi = {
  getByFlat: (flatId: string) => api.get<Inspection>(`/inspections/flat/${flatId}`),
  save: (id: string, responses: Partial<Inspection['responses']>) =>
    api.put<Inspection>(`/inspections/${id}`, { responses }),
  submit: (id: string) => api.post<{ inspection: Inspection; snags: Snag[] }>(`/inspections/${id}/submit`),
  resubmit: (id: string) => api.post(`/inspections/${id}/resubmit`),
}

export const responsesApi = {
  /** Engineer single-task status update (Req 1 & 2) */
  updateStatus: (
    responseId: string,
    body: { status: 'pass' | 'fail' | 'na' | 'pending'; remarks?: string }
  ) => api.patch(`/responses/${responseId}`, body),
  /** Checker per-task decision (Req 6) */
  setQaDecision: (
    responseId: string,
    body: { qaDecision: 'approved' | 'rejected' | 'revision_required'; qaRemark?: string }
  ) => api.patch(`/responses/${responseId}/qa-decision`, body),
}

export const imagesApi = {
  upload: (formData: FormData) =>
    api.post<{ id: string; url: string; thumbnailUrl: string }>('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/images/${id}`),
}

export const snagsApi = {
  list: (params: { flatId?: string; projectId?: string; inspectionId?: string }) =>
    api.get<Snag[]>('/snags', { params }),
  get: (id: string) => api.get<Snag>(`/snags/${id}`),
  rectify: (id: string, data: { remarks: string; afterImages?: string[] }) =>
    api.post<Snag>(`/snags/${id}/rectify`, data),
  verifyClose: (id: string, data: { approved: boolean; comments?: string }) =>
    api.post<Snag>(`/snags/${id}/verify-close`, data),
}

export const reviewsApi = {
  queue: (filter?: string) => api.get('/reviews/queue', { params: { filter } }),
  get: (inspectionId: string) => api.get(`/reviews/${inspectionId}`),
  submit: (data: {
    inspectionId: string
    decision: string
    overallComments: string
    itemComments: Record<string, string>
  }) => api.post<Review>('/reviews', data),
  history: () => api.get('/reviews/history/list'),
}

export const usersApi = {
  list: (role?: string) => api.get<User[]>('/users', { params: { role } }),
  create: (data: { name: string; email: string; mobile: string; password: string; role: string }) =>
    api.post<User>('/users', data),
  update: (id: string, data: Partial<{ name: string; email: string; mobile: string; role: string }>) =>
    api.put<User>(`/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    api.patch(`/users/${id}/password`, { newPassword }),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
  delete: (id: string) => api.delete(`/users/${id}`),
}

export const assignmentsApi = {
  create: (data: { flatId: string; engineerId: string; qaId: string }) =>
    api.post<Assignment>('/assignments', data),
  bulkCreate: (data: { flatIds: string[]; engineerId: string; qaId: string }) =>
    api.post<{ created: Assignment[]; skipped: string[] }>('/assignments/bulk', data),
  update: (id: string, data: { engineerId?: string; qaId?: string }) =>
    api.put<Assignment>(`/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/assignments/${id}`),
}

export const notificationsApi = {
  list: () => api.get<Notification[]>('/notifications'),
  count: () => api.get<{ unread: number }>('/notifications/count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}

export const reportsApi = {
  overview: () => api.get<DashboardData>('/reports/overview'),
  activity: (limit?: number) => api.get<ActivityEntry[]>('/reports/activity', { params: { limit } }),
  flats: (params: {
    projectId?: string
    engineerId?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }) => api.get<{
    summary: {
      total: number; notStarted: number; inProgress: number; submitted: number
      approved: number; rejected: number; revisionRequired: number; desnagging: number; openSnags: number
    }
    flats: Array<{
      flatId: string; flatNumber: string; flatStatus: string; towerName: string
      projectName: string; projectId: string; engineerName: string; engineerId: string
      inspectionStatus: string; submittedAt: string; lastUpdated: string
      passCount: number; failCount: number; pendingCount: number; openSnags: number
    }>
  }>('/reports/flats', { params }),
  export: (projectId: string, type: string) =>
    api.get(`/reports/export?projectId=${projectId}&type=${type}&format=csv`, { responseType: 'blob' }),
}

export const bulkUploadApi = {
  /** Download a pre-filled Excel checklist template for the project */
  downloadTemplate: (projectId: string) =>
    api.get(`/bulk-upload/checklist/template?projectId=${projectId}`, { responseType: 'blob' }),
  /** Upload filled Excel to bulk-update inspection responses */
  uploadChecklist: (projectId: string, file: File) => {
    const fd = new FormData()
    fd.append('projectId', projectId)
    fd.append('file', file)
    return api.post<{
      responsesUpdated: number
      flatsAffected: number
      skipped: Array<{ row: number; label: string; reason: string }>
      unknownItems: string[]
    }>('/bulk-upload/checklist', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const syncApi = {
  push: (changes: unknown[]) => api.post('/sync/push', { changes }),
  pull: (since: string, engineerId?: string) =>
    api.get('/sync/pull', { params: { since, engineerId } }),
}

export const templatesApi = {
  list:   () => api.get<ChecklistTemplate[]>('/templates'),
  create: (data: { name: string; sections: unknown[] }) =>
    api.post<ChecklistTemplate>('/templates', data),
  update: (id: string, data: { name?: string; sections?: unknown[] }) =>
    api.put<ChecklistTemplate>(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
}
