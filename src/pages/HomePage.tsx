import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMembers, getSmallGroups } from '@/lib/api'
import type { Member } from '@/types'
import { ROLE_PRIORITY } from '@/types'
import Layout from '@/components/Layout'
import MemberCard from '@/components/MemberCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { SparklesIcon, DocumentIcon } from '@/components/Icons'

export default function HomePage() {
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: getMembers,
  })

  const { data: smallGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['smallGroups'],
    queryFn: getSmallGroups,
  })

  const isLoading = membersLoading || groupsLoading

  // 최근 2주 업데이트된 멤버
  const recentMembers = useMemo(() => {
    if (!members) return []

    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    return members
      .filter((member) => new Date(member.updated_at) >= twoWeeksAgo)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [members])

  // 최근 업데이트된 멤버 ID Set
  const recentMemberIds = useMemo(() => {
    return new Set(recentMembers.map((m) => m.id))
  }, [recentMembers])

  // 멤버 정렬 함수: 교역자 > 다락방장 > 순장, 같은 역할이면 가나다순
  const sortMembers = (members: Member[]) => {
    return [...members].sort((a, b) => {
      const priorityDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role]
      if (priorityDiff !== 0) return priorityDiff
      return a.name.localeCompare(b.name, 'ko')
    })
  }

  // 다락방별로 그룹화 (모든 멤버, 정렬 적용)
  const membersByGroup = useMemo(() => {
    if (!smallGroups || !members) return new Map<string, Member[]>()

    const grouped = new Map<string, Member[]>()

    // 다락방을 가나다 순으로 정렬
    const sortedGroups = [...smallGroups].sort((a, b) =>
      a.name.localeCompare(b.name, 'ko')
    )

    sortedGroups.forEach((group) => {
      const groupMembers = members.filter(
        (member) => member.small_group_id === group.id
      )
      // 멤버가 없어도 다락방 섹션 표시
      grouped.set(group.name, sortMembers(groupMembers))
    })

    return grouped
  }, [smallGroups, members])

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Recent Updates Section */}
      {recentMembers.length > 0 && (
        <section className="mb-8 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <SparklesIcon className="text-xl text-blue-500" />
            최근 업데이트
            <span className="text-sm font-normal text-gray-400 ml-1">
              최근 2주
            </span>
          </h2>
          <div className="space-y-3">
            {recentMembers.map((member, index) => (
              <MemberCard key={member.id} member={member} isRecent showGroup index={index} />
            ))}
          </div>
        </section>
      )}

      {/* All Members by Group */}
      {membersByGroup.size > 0 ? (
        <div className="space-y-6">
          {Array.from(membersByGroup.entries()).map(([groupName, groupMembers]) => (
            <section key={groupName} className="p-5 bg-white rounded-2xl border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-icons-outlined text-xl text-gray-400">groups</span>
                {groupName}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  {groupMembers.length}명
                </span>
              </h2>
              {groupMembers.length > 0 ? (
                <div className="space-y-3">
                  {groupMembers.map((member, index) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      index={index}
                      isRecent={recentMemberIds.has(member.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <span className="material-icons-outlined text-3xl mb-2">person_off</span>
                  <p className="text-sm">아직 멤버가 없습니다</p>
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <DocumentIcon className="text-6xl text-gray-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            아직 등록된 멤버가 없습니다
          </h2>
          <p className="text-gray-500">
            관리자 페이지에서 다락방과 멤버를 추가해주세요
          </p>
        </div>
      )}
    </Layout>
  )
}
