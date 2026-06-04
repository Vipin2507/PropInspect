import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { dashboardForRole, ROUTES } from '../constants/routes'
import type { UserRole } from '../types'

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, token } = useAuthStore()

  if (!token || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardForRole(user.role)} replace />
  }

  return <Outlet />
}
