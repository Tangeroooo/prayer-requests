import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMember } from '@/lib/api'
import { ROLE_LABELS } from '@/types'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ExclamationIcon, ChevronLeftIcon } from '@/components/Icons'

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()

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
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="text-lg" />
          목록으로
        </Link>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Photo */}
          {photoUrl ? (
            <div
              className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl flex-shrink-0 overflow-hidden bg-gray-100"
              style={{
                backgroundImage: `url(${photoUrl})`,
                backgroundPosition: `${member.photo_position?.x || 50}% ${member.photo_position?.y || 50}%`,
                backgroundSize: `${(member.photo_position?.zoom ?? 1) * 100}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          ) : (
            <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl icon-bg flex-shrink-0 flex items-center justify-center">
              <span className="material-icons-outlined icon-color text-8xl">person</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
              <span className="text-sm px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {ROLE_LABELS[member.role]}
              </span>
            </div>
            <p className="text-gray-500 mb-4">{member.small_group?.name}</p>
            <p className="text-sm text-gray-400">
              마지막 업데이트: {formatDate(member.updated_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Prayer Requests */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기도제목</h2>
        {member.prayer_requests && member.prayer_requests.length > 0 ? (
          <div className="space-y-3">
            {member.prayer_requests.map((request, index) => (
              <div key={request.id} className="card">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700 whitespace-pre-wrap">{request.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(request.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-gray-500">등록된 기도제목이 없습니다</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
