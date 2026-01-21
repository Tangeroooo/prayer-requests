import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  getSmallGroups,
  getMembers,
  createSmallGroup,
  updateSmallGroup,
  deleteSmallGroup,
  createMember,
  deleteMember,
} from '@/lib/api'
import type { SmallGroup, Member, MemberRole } from '@/types'
import { ROLE_LABELS, ROLE_ICONS, ROLE_PRIORITY } from '@/types'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [editingGroup, setEditingGroup] = useState<SmallGroup | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [addingMemberToGroup, setAddingMemberToGroup] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>('sub_leader')
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['smallGroups'],
    queryFn: getSmallGroups,
  })

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: getMembers,
  })

  // Group mutations
  const createGroupMutation = useMutation({
    mutationFn: createSmallGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smallGroups'] })
      setNewGroupName('')
      setShowAddGroup(false)
    },
  })

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateSmallGroup(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smallGroups'] })
      setEditingGroup(null)
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: deleteSmallGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smallGroups'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  // Member mutations
  const createMemberMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setAddingMemberToGroup(null)
      setNewMemberName('')
      setNewMemberRole('sub_leader')
    },
  })

  const deleteMemberMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  // Group handlers
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroupMutation.mutate(newGroupName.trim())
    }
  }

  const handleStartEditGroup = (group: SmallGroup) => {
    setEditingGroup(group)
    setEditGroupName(group.name)
  }

  const handleSaveEditGroup = () => {
    if (editingGroup && editGroupName.trim()) {
      updateGroupMutation.mutate({ id: editingGroup.id, name: editGroupName.trim() })
    }
  }

  const handleDeleteGroup = (group: SmallGroup) => {
    if (confirm(`"${group.name}" 다락방을 삭제하시겠습니까?\n소속된 모든 멤버도 함께 삭제됩니다.`)) {
      deleteGroupMutation.mutate(group.id)
    }
  }

  // Member handlers
  const handleStartAddMember = (groupId: string) => {
    setAddingMemberToGroup(groupId)
    setNewMemberName('')
    setNewMemberRole('sub_leader')
  }

  const handleCreateMember = () => {
    if (newMemberName.trim() && addingMemberToGroup) {
      createMemberMutation.mutate({
        name: newMemberName.trim(),
        role: newMemberRole,
        small_group_id: addingMemberToGroup,
      })
    }
  }

  const handleDeleteMember = (member: Member) => {
    if (confirm(`"${member.name}" 멤버를 삭제하시겠습니까?`)) {
      deleteMemberMutation.mutate(member.id)
    }
  }

  // Group members by small group
  const getMembersByGroup = (groupId: string) => {
    if (!members) return []
    return members
      .filter(m => m.small_group_id === groupId)
      .sort((a, b) => {
        // Sort by role priority, then by name
        const priorityDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role]
        if (priorityDiff !== 0) return priorityDiff
        return a.name.localeCompare(b.name, 'ko')
      })
  }

  const sortedGroups = groups?.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko')) || []

  if (groupsLoading || membersLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">관리</h1>

      {/* Groups with members */}
      <div className="space-y-6">
        {sortedGroups.length > 0 ? (
          sortedGroups.map((group) => (
            <div key={group.id} className="card">
              {/* Group header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                {editingGroup?.id === group.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      className="input flex-1"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditGroup()}
                    />
                    <button onClick={handleSaveEditGroup} className="btn-primary text-sm">
                      저장
                    </button>
                    <button
                      onClick={() => setEditingGroup(null)}
                      className="btn-secondary text-sm"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="material-icons-outlined text-gray-400">groups</span>
                      <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                      <span className="text-sm text-gray-400">
                        ({getMembersByGroup(group.id).length}명)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEditGroup(group)}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <span className="material-icons-outlined text-sm">edit</span>
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group)}
                        className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <span className="material-icons-outlined text-sm">delete</span>
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Members list */}
              <div className="space-y-2">
                {getMembersByGroup(group.id).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-icons-outlined text-gray-400 text-lg">person</span>
                      <span className="font-medium text-gray-900">{member.name}</span>
                      <span className="chip text-xs py-0.5 px-2 inline-flex items-center gap-1">
                        <span className="material-icons text-xs leading-none">{ROLE_ICONS[member.role]}</span>
                        {ROLE_LABELS[member.role]}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/member/${member.id}/edit`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        편집
                      </Link>
                      <button
                        onClick={() => handleDeleteMember(member)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}

                {getMembersByGroup(group.id).length === 0 && !addingMemberToGroup && (
                  <p className="text-center text-gray-400 py-4 text-sm">
                    아직 멤버가 없습니다
                  </p>
                )}

                {/* Add member form */}
                {addingMemberToGroup === group.id ? (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="이름"
                        className="input flex-1"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateMember()}
                      />
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as MemberRole)}
                        className="input w-28"
                      >
                        <option value="pastor">교역자</option>
                        <option value="leader">다락방장</option>
                        <option value="sub_leader">순장</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateMember}
                        disabled={!newMemberName.trim() || createMemberMutation.isPending}
                        className="btn-primary text-sm"
                      >
                        추가
                      </button>
                      <button
                        onClick={() => setAddingMemberToGroup(null)}
                        className="btn-secondary text-sm"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartAddMember(group.id)}
                    className="w-full p-3 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center gap-1 text-sm"
                  >
                    <span className="material-icons-outlined text-lg">person_add</span>
                    새 멤버 추가
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-8">
            <span className="material-icons-outlined text-5xl text-gray-300 mb-3">folder_off</span>
            <p className="text-gray-500">등록된 다락방이 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">아래 버튼을 눌러 다락방을 추가하세요</p>
          </div>
        )}

        {/* Add new group */}
        {showAddGroup ? (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="material-icons-outlined text-gray-400">add_circle</span>
              새 다락방 추가
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="다락방 이름"
                className="input flex-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              />
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || createGroupMutation.isPending}
                className="btn-primary"
              >
                추가
              </button>
              <button onClick={() => setShowAddGroup(false)} className="btn-secondary">
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddGroup(true)}
            className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-icons-outlined">add</span>
            새 그룹 추가하기
          </button>
        )}
      </div>
    </Layout>
  )
}
