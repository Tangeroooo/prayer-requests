import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMember } from '@/lib/api'
import { ROLE_LABELS, ROLE_ICONS } from '@/types'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ExclamationIcon, ChevronLeftIcon } from '@/components/Icons'

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPhotoModalOpen(false)
    }
    if (isPhotoModalOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isPhotoModalOpen])

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => getMember(id!),
    enabled: !!id,
  })

  // 훅은 항상 조건부 return 전에 호출해야 함
  const { signedUrl: photoUrl } = useSignedUrl(member?.photo_url)

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    )
  }

  if (error || !member) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <ExclamationIcon className="text-6xl text-gray-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            멤버를 찾을 수 없습니다
          </h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            홈으로 돌아가기
          </Link>
        </div>
      </Layout>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Layout>
      <div className="mb-3 sm:mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="text-lg" />
          목록으로
        </Link>
      </div>

      <div className="card mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          {/* Photo */}
          {photoUrl ? (
            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              className="w-44 h-44 sm:w-56 sm:h-56 rounded-3xl flex-shrink-0 overflow-hidden bg-gray-100 cursor-zoom-in hover:opacity-90 transition-opacity"
              style={{
                backgroundImage: `url(${photoUrl})`,
                backgroundPosition: `${member.photo_position?.x || 50}% ${member.photo_position?.y || 50}%`,
                backgroundSize: `${(member.photo_position?.zoom ?? 1) * 100}%`,
                backgroundRepeat: 'no-repeat',
              }}
              aria-label="사진 확대"
            />
          ) : (
            <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-3xl icon-bg flex-shrink-0 flex items-center justify-center">
              <span className="material-icons-outlined icon-color text-7xl sm:text-8xl">person</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{member.name}</h1>
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="text-sm sm:text-base px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                <span className="material-icons text-sm sm:text-base">{ROLE_ICONS[member.role]}</span>
                {ROLE_LABELS[member.role]}
              </span>
              {member.small_group?.name && (
                <span className="text-sm sm:text-base px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                  <span className="material-icons text-sm sm:text-base">groups</span>
                  {member.small_group.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prayer Requests */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-4">기도제목</h2>
        {member.prayer_requests && member.prayer_requests.length > 0 ? (
          <div className="space-y-2 sm:space-y-4">
            {member.prayer_requests.map((request, index) => (
              <div key={request.id} className="card !p-3 sm:!p-6">
                <div className="flex gap-2 sm:gap-4">
                  <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm sm:text-base font-medium text-gray-500">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base sm:text-lg text-gray-700 whitespace-pre-wrap leading-relaxed">{request.content}</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-2 sm:mt-3">
                      {formatDate(request.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-6 sm:py-8">
            <p className="text-base sm:text-lg text-gray-500">등록된 기도제목이 없습니다</p>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {isPhotoModalOpen && photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsPhotoModalOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="닫기"
          >
            <span className="material-icons text-4xl">close</span>
          </button>
          <div
            className="max-w-[90vw] max-h-[90vh] w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] rounded-2xl overflow-hidden bg-gray-900"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundImage: `url(${photoUrl})`,
              backgroundPosition: `${member.photo_position?.x || 50}% ${member.photo_position?.y || 50}%`,
              backgroundSize: `${(member.photo_position?.zoom ?? 1) * 100}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        </div>
      )}
    </Layout>
  )
}
