import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSharedAuthErrorMessage, signInWithSharedPassword } from '@/lib/auth'
import { PrayingHandsIcon } from '@/components/Icons'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    setIsSubmitting(true)

    try {
      await signInWithSharedPassword('site', password)
      navigate('/')
    } catch (err) {
      setError(getSharedAuthErrorMessage(err, '비밀번호가 올바르지 않습니다'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl icon-bg flex items-center justify-center">
            <PrayingHandsIcon className="text-4xl icon-color" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">13TH CROSS 리더십 기도제목</h1>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <div className="mb-5">
            <label htmlFor="password" className="label flex items-center gap-1">
              <span className="material-icons-outlined text-base">lock</span>
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
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

          <button
            type="submit"
            disabled={!password || isSubmitting}
            className="btn-primary w-full"
          >
            <span className="material-icons-outlined text-lg">login</span>
            {isSubmitting ? '확인 중...' : '접속하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
