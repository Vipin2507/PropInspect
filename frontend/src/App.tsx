import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ROUTES, dashboardForRole } from './constants/routes'
import { useAuthStore } from './store/authStore'

import LoginPage from './pages/auth/LoginPage'
import OTPPage from './pages/auth/OTPPage'
import ProfilePage from './pages/profile/ProfilePage'

import EngineerDashboard from './pages/engineer/EngineerDashboard'
import MyFlats from './pages/engineer/MyFlats'
import FlatDetail from './pages/engineer/FlatDetail'
import FillChecklist from './pages/engineer/FillChecklist'
import CategorySummary from './pages/engineer/CategorySummary'
import InspectionSummaryPage from './pages/engineer/InspectionSummaryPage'
import NotificationsPage from './pages/engineer/NotificationsPage'
import FlatSnagList from './pages/engineer/FlatSnagList'

import QADashboard from './pages/qa/QADashboard'
import PendingReviews from './pages/qa/PendingReviews'
import ReviewDetail from './pages/qa/ReviewDetail'
import ReviewHistory from './pages/qa/ReviewHistory'

import SnagList from './pages/desnagging/SnagList'
import SnagDetail from './pages/desnagging/SnagDetail'

import AdminDashboard from './pages/admin/AdminDashboard'
import FlatMonitoring from './pages/admin/FlatMonitoring'
import ProjectsList from './pages/admin/projects/ProjectsList'
import ProjectDetail from './pages/admin/projects/ProjectDetail'
import TowerDetail from './pages/admin/projects/TowerDetail'
import FlatManagement from './pages/admin/projects/FlatManagement'
import UserManagement from './pages/admin/users/UserManagement'
import ChecklistTemplates from './pages/admin/templates/ChecklistTemplates'
import Reports from './pages/admin/reports/Reports'

import ActivityLog from './pages/admin/ActivityLog'

function HomeRedirect() {
  const user  = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  if (!token || !user) return <Navigate to={ROUTES.LOGIN} replace />
  return <Navigate to={dashboardForRole(user.role)} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" />
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.OTP}   element={<OTPPage />} />
        <Route path="/"            element={<HomeRedirect />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>

            {/* ── Profile + Notifications — all authenticated users ── */}
            <Route path={ROUTES.PROFILE}                element={<ProfilePage />} />
            <Route path={ROUTES.ENGINEER_NOTIFICATIONS} element={<NotificationsPage />} />

            {/* ── Engineer routes — engineer + admin ── */}
            <Route element={<ProtectedRoute roles={['engineer', 'admin']} />}>
              <Route path={ROUTES.ENGINEER_DASHBOARD} element={<EngineerDashboard />} />
              <Route path={ROUTES.ENGINEER_FLATS}     element={<MyFlats />} />
              <Route path="/engineer/flats/:flatId"   element={<FlatDetail />} />
              <Route path="/engineer/flats/:flatId/checklist/:categoryId?" element={<FillChecklist />} />
              <Route path="/engineer/flats/:flatId/summary/:categoryId"    element={<CategorySummary />} />
              <Route path="/engineer/flats/:flatId/inspection-summary"     element={<InspectionSummaryPage />} />
              <Route path="/engineer/flats/:flatId/snags"                  element={<FlatSnagList />} />
            </Route>

            {/* ── QA routes — qa + admin ── */}
            <Route element={<ProtectedRoute roles={['qa', 'admin']} />}>
              <Route path={ROUTES.QA_DASHBOARD} element={<QADashboard />} />
              <Route path={ROUTES.QA_REVIEWS}   element={<PendingReviews />} />
              <Route path="/qa/reviews/:inspectionId" element={<ReviewDetail />} />
              <Route path={ROUTES.QA_HISTORY}   element={<ReviewHistory />} />
            </Route>

            {/* ── Admin routes — admin + viewer ── */}
            <Route element={<ProtectedRoute roles={['admin', 'viewer']} />}>
              <Route path={ROUTES.ADMIN}          element={<AdminDashboard />} />
              <Route path={ROUTES.ADMIN_PROJECTS} element={<ProjectsList />} />
              <Route path="/admin/projects/:id"   element={<ProjectDetail />} />
              <Route path="/admin/projects/:id/towers/:towerId" element={<TowerDetail />} />
              <Route path="/admin/projects/:id/flats"           element={<FlatManagement />} />
              <Route path={ROUTES.ADMIN_USERS}       element={<UserManagement />} />
              <Route path={ROUTES.ADMIN_TEMPLATES}   element={<ChecklistTemplates />} />
              <Route path={ROUTES.ADMIN_REPORTS}     element={<Reports />} />
              <Route path={ROUTES.ADMIN_MONITORING}  element={<FlatMonitoring />} />
              <Route path={ROUTES.ADMIN_ACTIVITY}    element={<ActivityLog />} />
            </Route>

            {/* ── De-Snagging — all roles ── */}
            <Route path={ROUTES.DESNAGGING}        element={<SnagList />} />
            <Route path="/desnagging/:snagId"      element={<SnagDetail />} />

          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
