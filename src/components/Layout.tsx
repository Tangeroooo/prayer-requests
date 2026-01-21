import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PrayingHandsIcon } from '@/components/Icons'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { isAdmin, logout, setAdminMode } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg icon-bg flex items-center justify-center">
                <PrayingHandsIcon className="text-xl icon-color" />
              </div>
              <span className="font-bold text-gray-900">13th Friend 리더십 기도제목</span>
            </Link>

            <nav className="flex items-center gap-1">
              {isAdmin ? (
                <>
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/admin'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-icons-outlined text-lg">settings</span>
                    <span className="hidden sm:inline">관리</span>
                  </Link>
                  <button
                    onClick={() => setAdminMode(false)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-icons-outlined text-lg">logout</span>
                    <span className="hidden sm:inline">관리자 종료</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/admin-login"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span className="material-icons-outlined text-lg">admin_panel_settings</span>
                  <span className="hidden sm:inline">관리자</span>
                </Link>
              )}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span className="material-icons-outlined text-lg">power_settings_new</span>
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="material-icons-outlined text-xl text-gray-400">church</span>
            <span className="text-gray-600 font-medium">13th Friend 리더십 기도제목</span>
          </div>
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            멘토님 감사합니다
            <span className="material-icons text-red-400 text-sm">favorite</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
