import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyAdminPassword } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { LockIcon } from '@/components/Icons'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { setAdminMode } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const isValid = verifyAdminPassword(password)
    if (isValid) {
      setAdminMode(true)
      navigate('/admin')
    } else {
      setError('관리자 비밀번호가 올바르지 않습니다')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl icon-bg flex items-center justify-center">
            <LockIcon className="text-4xl icon-color" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">관리자 로그인</h1>
          <p className="text-gray-500">관리자 비밀번호를 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <div className="mb-5">
            <label htmlFor="admin-password" className="label flex items-center gap-1">
              <span className="material-icons-outlined text-base">admin_panel_settings</span>
              관리자 비밀번호
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="관리자 비밀번호를 입력하세요"
              className="input"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2 border border-red-100">
              <span className="material-icons text-lg">error</span>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={!password}
              className="btn-primary w-full"
            >
              <span className="material-icons-outlined text-lg">login</span>
              로그인
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary w-full"
            >
              <span className="material-icons-outlined text-lg">arrow_back</span>
              돌아가기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
