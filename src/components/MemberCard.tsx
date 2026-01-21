import { Link } from 'react-router-dom'
import type { Member } from '@/types'
import { ROLE_LABELS, ROLE_ICONS } from '@/types'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { useAuth } from '@/contexts/AuthContext'

interface MemberCardProps {
  member: Member
  isRecent?: boolean
  showGroup?: boolean
  index?: number
}

export default function MemberCard({ member, isRecent, showGroup = false, index = 0 }: MemberCardProps) {
  const { isAdmin } = useAuth()
  const { signedUrl: photoUrl } = useSignedUrl(member.photo_url)
  const latestPrayerRequest = member.prayer_requests?.[0]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '오늘'
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return `${diffDays}일 전`
    if (diffDays < 14) return '1주 전'
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  return (
    <Link
      to={isAdmin ? `/member/${member.id}/edit` : `/member/${member.id}`}
      className={`card group block animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}
    >
      <div className="flex gap-4">
        {/* Photo */}
        <div className="flex-shrink-0">
          {photoUrl ? (
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gray-100"
              style={{
                backgroundImage: `url(${photoUrl})`,
                backgroundPosition: `${member.photo_position?.x || 50}% ${member.photo_position?.y || 50}%`,
                backgroundSize: `${(member.photo_position?.zoom ?? 1) * 100}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl icon-bg flex items-center justify-center">
              <span className="material-icons-outlined icon-color text-4xl sm:text-5xl">person</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and Date row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-gray-600 transition-colors">
              {member.name}
            </h3>
            <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
              <span className="material-icons-outlined text-sm">schedule</span>
              {formatDate(member.updated_at)}
            </span>
          </div>

          {/* Badges row - always inline */}
          <div className="flex items-center gap-2 mb-1">
            <span className="chip text-xs py-0.5 px-2 inline-flex items-center gap-1 whitespace-nowrap">
              <span className="material-icons text-xs leading-none">{ROLE_ICONS[member.role]}</span>
              {ROLE_LABELS[member.role]}
            </span>
            {isRecent && (
              <span className="chip-accent text-xs py-0.5 px-2 inline-flex items-center gap-1 whitespace-nowrap">
                <span className="material-icons text-xs leading-none">auto_awesome</span>
                최근
              </span>
            )}
          </div>

          {showGroup && member.small_group?.name && (
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
              <span className="material-icons-outlined text-base">groups</span>
              {member.small_group.name}
            </p>
          )}
          {latestPrayerRequest && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {latestPrayerRequest.content}
            </p>
          )}
          {member.prayer_requests && member.prayer_requests.length > 1 && (
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
              <span className="material-icons text-sm">format_list_bulleted</span>
              총 {member.prayer_requests.length}개 기도제목
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
