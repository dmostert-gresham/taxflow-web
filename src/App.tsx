import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useInactivityTimeout } from './hooks/useInactivityTimeout'
import AppShell from './components/layout/AppShell'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import DashboardPage from './features/dashboard/DashboardPage'
import TransactionsPage from './features/transactions/TransactionsPage'
import ReturnsPage from './features/returns/ReturnsPage'
import DocumentsPage from './features/documents/DocumentsPage'
import AssistantPage from './features/assistant/AssistantPage'
import BillingPage from './features/billing/BillingPage'
import TrialBalancePage from './features/trial-balance/TrialBalancePage'
import ItasPreFillPage from './features/returns/ItasPreFillPage'
import AdminUsersPage from './features/admin/AdminUsersPage'
import ProfilePage from './features/profile/ProfilePage'
import PractitionerClientsPage from './features/practitioner/PractitionerClientsPage'
import PrivacyPolicyPage from './features/legal/PrivacyPolicyPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/ResetPasswordPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export default function App() {
  useInactivityTimeout()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />

      {/* Guest routes */}
      <Route path="/login" element={
        <RequireGuest><LoginPage /></RequireGuest>
      } />
      <Route path="/register" element={
        <RequireGuest><RegisterPage /></RequireGuest>
      } />
      <Route path="/forgot-password" element={
        <RequireGuest><ForgotPasswordPage /></RequireGuest>
      } />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Authenticated routes — inside AppShell (sidebar layout) */}
      <Route path="/" element={
        <RequireAuth><AppShell /></RequireAuth>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<DashboardPage />} />
        <Route path="transactions"  element={<TransactionsPage />} />
        <Route path="returns"       element={<ReturnsPage />} />
        <Route path="returns/itas"  element={<ItasPreFillPage />} />
        <Route path="documents"     element={<DocumentsPage />} />
        <Route path="assistant"     element={<AssistantPage />} />
        <Route path="trial-balance" element={<TrialBalancePage />} />
        <Route path="billing"       element={<BillingPage />} />
        <Route path="profile"       element={<ProfilePage />} />
          <Route path="/admin/users"           element={<AdminUsersPage />} />
          <Route path="practitioner/clients"  element={<PractitionerClientsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
