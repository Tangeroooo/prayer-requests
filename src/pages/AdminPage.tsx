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
import type { SmallGroup, MemberRole } from '@/types'
import { ROLE_LABELS } from '@/types'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'members'>('groups')

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">관리</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          다락방 관리
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'members'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          멤버 관리
        </button>
      </div>

      {activeTab === 'groups' ? <SmallGroupsManager /> : <MembersManager />}
    </Layout>
  )
}

// Small Groups Manager
function SmallGroupsManager() {
  const queryClient = useQueryClient()
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroup, setEditingGroup] = useState<SmallGroup | null>(null)
  const [editName, setEditName] = useState('')

  const { data: groups, isLoading } = useQuery({
    queryKey: ['smallGroups'],
    queryFn: getSmallGroups,
  })

  const createMutation = useMutation({
    mutationFn: createSmallGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smallGroups'] })
      setNewGroupName('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateSmallGroup(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smallGroups'] })
      setEditingGroup(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSmallGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smallGroups'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const handleCreate = () => {
    if (newGroupName.trim()) {
      createMutation.mutate(newGroupName.trim())
    }
  }

  const handleStartEdit = (group: SmallGroup) => {
    setEditingGroup(group)
    setEditName(group.name)
  }

  const handleSaveEdit = () => {
    if (editingGroup && editName.trim()) {
      updateMutation.mutate({ id: editingGroup.id, name: editName.trim() })
    }
  }

  const handleDelete = (group: SmallGroup) => {
    if (confirm(`"${group.name}" 다락방을 삭제하시겠습니까?\n소속된 모든 멤버도 함께 삭제됩니다.`)) {
      deleteMutation.mutate(group.id)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Add new group */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">새 다락방 추가</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="다락방 이름"
            className="input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!newGroupName.trim() || createMutation.isPending}
            className="btn-primary"
          >
            추가
          </button>
        </div>
      </div>

      {/* Groups list */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">다락방 목록</h2>
        {groups && groups.length > 0 ? (
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                {editingGroup?.id === group.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input flex-1"
                      autoFocus
                    />
                    <button onClick={handleSaveEdit} className="btn-primary text-sm">
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
                    <span className="font-medium text-gray-900">{group.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(group)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">등록된 다락방이 없습니다</p>
        )}
      </div>
    </div>
  )
}

// Members Manager
function MembersManager() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>('sub_leader')
  const [newMemberGroupId, setNewMemberGroupId] = useState('')

  const { data: groups } = useQuery({
    queryKey: ['smallGroups'],
    queryFn: getSmallGroups,
  })

  const { data: members, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: getMembers,
  })

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setShowAddForm(false)
      setNewMemberName('')
      setNewMemberRole('sub_leader')
      setNewMemberGroupId('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const handleCreate = () => {
    if (newMemberName.trim() && newMemberGroupId) {
      createMutation.mutate({
        name: newMemberName.trim(),
        role: newMemberRole,
        small_group_id: newMemberGroupId,
      })
    }
  }

  const handleDelete = (member: { id: string; name: string }) => {
    if (confirm(`"${member.name}" 멤버를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(member.id)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Add new member */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">새 멤버 추가</h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-secondary text-sm"
              disabled={!groups?.length}
            >
              + 멤버 추가
            </button>
          )}
        </div>

        {!groups?.length && (
          <p className="text-sm text-gray-500">먼저 다락방을 추가해주세요.</p>
        )}

        {showAddForm && groups && groups.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className="label">이름</label>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="이름"
                className="input"
              />
            </div>
            <div>
              <label className="label">다락방</label>
              <select
                value={newMemberGroupId}
                onChange={(e) => setNewMemberGroupId(e.target.value)}
                className="input"
              >
                <option value="">선택하세요</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">역할</label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as MemberRole)}
                className="input"
              >
                <option value="leader">다락방장</option>
                <option value="sub_leader">순장</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newMemberName.trim() || !newMemberGroupId || createMutation.isPending}
                className="btn-primary"
              >
                추가
              </button>
              <button onClick={() => setShowAddForm(false)} className="btn-secondary">
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">멤버 목록</h2>
        {members && members.length > 0 ? (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{member.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                      {ROLE_LABELS[member.role]}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{member.small_group?.name}</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/member/${member.id}/edit`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    편집
                  </Link>
                  <button
                    onClick={() => handleDelete(member)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">등록된 멤버가 없습니다</p>
        )}
      </div>
    </div>
  )
}
