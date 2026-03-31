import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/pages/LoginPage'
import AdminLoginPage from '@/pages/AdminLoginPage'
import HomePage from '@/pages/HomePage'
import MemberDetailPage from '@/pages/MemberDetailPage'
import MemberEditPage from '@/pages/MemberEditPage'
import AdminPage from '@/pages/AdminPage'
import LoadingSpinner from '@/components/LoadingSpinner'

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm card">
        <LoadingSpinner />
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/admin-login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoading ? <AuthLoadingScreen /> : isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />
      <Route
        path="/admin-login"
        element={
          isLoading ? (
            <AuthLoadingScreen />
          ) : isAdmin ? (
            <Navigate to="/admin" replace />
          ) : (
            <ProtectedRoute>
              <AdminLoginPage />
            </ProtectedRoute>
          )
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/:id"
        element={
          <ProtectedRoute>
            <MemberDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/:id/edit"
        element={
          <AdminRoute>
            <MemberEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
