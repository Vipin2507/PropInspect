export const ROUTES = {
  LOGIN: '/login',
  OTP: '/otp',
  ENGINEER_DASHBOARD: '/engineer/dashboard',
  ENGINEER_FLATS: '/engineer/flats',
  ENGINEER_FLAT: (flatId: string) => `/engineer/flats/${flatId}`,
  ENGINEER_CHECKLIST: (flatId: string, categoryId?: string) =>
    `/engineer/flats/${flatId}/checklist${categoryId ? `/${categoryId}` : ''}`,
  ENGINEER_CATEGORY_SUMMARY: (flatId: string, categoryId: string) =>
    `/engineer/flats/${flatId}/summary/${categoryId}`,
  ENGINEER_INSPECTION_SUMMARY: (flatId: string) => `/engineer/flats/${flatId}/inspection-summary`,
  ENGINEER_FLAT_SNAGS: (flatId: string) => `/engineer/flats/${flatId}/snags`,
  ENGINEER_NOTIFICATIONS: '/engineer/notifications',
  QA_DASHBOARD: '/qa/dashboard',
  QA_REVIEWS: '/qa/reviews',
  QA_REVIEW_DETAIL: (inspectionId: string) => `/qa/reviews/${inspectionId}`,
  QA_HISTORY: '/qa/reviewed',
  ADMIN: '/admin',
  ADMIN_PROJECTS: '/admin/projects',
  ADMIN_PROJECT: (id: string) => `/admin/projects/${id}`,
  ADMIN_TOWER: (projectId: string, towerId: string) => `/admin/projects/${projectId}/towers/${towerId}`,
  ADMIN_FLATS: (projectId: string) => `/admin/projects/${projectId}/flats`,
  ADMIN_USERS: '/admin/users',
  ADMIN_TEMPLATES: '/admin/templates',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_MONITORING: '/admin/monitoring',
  ADMIN_ACTIVITY: '/admin/activity',
  DESNAGGING: '/desnagging',
  DESNAGGING_DETAIL: (snagId: string) => `/desnagging/${snagId}`,
  PROFILE: '/profile',
} as const

export function dashboardForRole(role: string): string {
  switch (role) {
    case 'admin':
    case 'viewer':
      return ROUTES.ADMIN
    case 'engineer':
      return ROUTES.ENGINEER_DASHBOARD
    case 'qa':
      return ROUTES.QA_DASHBOARD
    default:
      return ROUTES.LOGIN
  }
}
