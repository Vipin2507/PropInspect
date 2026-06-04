import axios from 'axios'
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
  Assignment,
  ChecklistTemplate,
  Review,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('snagdesk_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/login', { email, password }),
  me: () => api.get<{ user: User }>('/auth/me'),
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
}

export const floorsApi = {
  list: (towerId: string) => api.get<Floor[]>(`/floors?towerId=${towerId}`),
}

export const flatsApi = {
  byEngineer: (engineerId: string) => api.get<Flat[]>(`/flats?engineerId=${engineerId}`),
  byProject: (projectId: string) => api.get<Flat[]>(`/flats?projectId=${projectId}`),
  byTower: (towerId: string) => api.get<Flat[]>(`/flats?towerId=${towerId}`),
  get: (id: string) => api.get<Flat>(`/flats/${id}`),
}

export const inspectionsApi = {
  getByFlat: (flatId: string) => api.get<Inspection>(`/inspections/flat/${flatId}`),
  save: (id: string, responses: Partial<Inspection['responses']>) =>
    api.put<Inspection>(`/inspections/${id}`, { responses }),
  submit: (id: string) => api.post<{ inspection: Inspection; snags: Snag[] }>(`/inspections/${id}/submit`),
  resubmit: (id: string) => api.post(`/inspections/${id}/resubmit`),
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
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
}

export const assignmentsApi = {
  create: (data: { flatId: string; engineerId: string; qaId: string }) =>
    api.post<Assignment>('/assignments', data),
}

export const notificationsApi = {
  list: () => api.get<Notification[]>('/notifications'),
  count: () => api.get<{ unread: number }>('/notifications/count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}

export const reportsApi = {
  overview: () => api.get<DashboardData>('/reports/overview'),
  export: (projectId: string, type: string) =>
    api.get(`/reports/export?projectId=${projectId}&type=${type}&format=csv`, { responseType: 'blob' }),
}

export const syncApi = {
  push: (changes: unknown[]) => api.post('/sync/push', { changes }),
  pull: (since: string, engineerId?: string) =>
    api.get('/sync/pull', { params: { since, engineerId } }),
}

export const templatesApi = {
  list: () => api.get<ChecklistTemplate[]>('/templates'),
}
