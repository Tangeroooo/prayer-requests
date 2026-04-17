import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createGroup,
  createMember,
  createMinistryUnit,
  deleteGroup,
  deleteMember,
  deleteMinistryUnit,
  getGroups,
  getMembers,
  getMinistryUnits,
  updateGroup,
  updateMinistryUnit,
} from '@/lib/api'
import {
  formatMinistryUnitPath,
  getDefaultMemberRoleForUnit,
  getDefaultMemberTypeForUnit,
  getMemberBadges,
  isRootMinistryUnit,
  isUngroupedSmallGroup,
  sortGroups,
  sortMembers,
  sortMinistryUnits,
} from '@/lib/hierarchy'
import type { Group, Member, MemberRole, MemberType, MinistryUnit, MinistryUnitType } from '@/types'
import { MEMBER_ROLE_LABELS, MINISTRY_UNIT_TYPE_ICONS, MINISTRY_UNIT_TYPE_LABELS } from '@/types'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  useSessionStorageState,
  useWindowScrollRestoration,
} from '@/hooks/useScrollRestoration'
import { createReturnToState } from '@/lib/navigation'

type AddUnitScope = { kind: 'group'; groupId: string } | { kind: 'root' } | null

interface GroupAdminTab {
  id: string
  kind: 'group'
  label: string
  group: Group
  units: MinistryUnit[]
  memberCount: number
}

interface CommunityAdminTab {
  id: string
  kind: 'root'
  label: string
  rootUnits: MinistryUnit[]
  ungroupedSmallGroups: MinistryUnit[]
  memberCount: number
}

type AdminTab = GroupAdminTab | CommunityAdminTab

const isGroupAssignableUnitType = (unitType: MinistryUnitType) => unitType !== 'mc_team'

const getUnitGroupPlaceholder = (unitType: MinistryUnitType) =>
  unitType === 'small_group' ? '그룹 미지정' : '공동체'

const usesSelectableMemberRole = (memberType: MemberType) => memberType === 'regular'

const normalizeSelectableMemberRole = (memberRole: MemberRole) =>
  memberRole === 'leader' || memberRole === 'sub_leader' || memberRole === 'group_leadership'
    ? memberRole
    : 'sub_leader'

const ADMIN_ACTIVE_TAB_STORAGE_KEY = 'admin-page:active-tab'
const ADMIN_SCROLL_STORAGE_KEY = 'admin-page'
const ADMIN_UNIT_SECTION_STORAGE_KEY = 'admin-page:unit-sections'

export default function AdminPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const [activeTabId, setActiveTabId] = useSessionStorageState<string | null>(
    ADMIN_ACTIVE_TAB_STORAGE_KEY,
    null,
    { resetOnReload: true }
  )
  const [expandedUnitSections, setExpandedUnitSections] = useSessionStorageState<
    Record<string, boolean>
  >(
    ADMIN_UNIT_SECTION_STORAGE_KEY,
    {}
  )

  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const [editingUnit, setEditingUnit] = useState<MinistryUnit | null>(null)
  const [editUnitName, setEditUnitName] = useState('')
  const [editUnitType, setEditUnitType] = useState<MinistryUnitType>('small_group')
  const [editUnitGroupId, setEditUnitGroupId] = useState('')

  const [addingUnitScope, setAddingUnitScope] = useState<AddUnitScope>(null)
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitType, setNewUnitType] = useState<MinistryUnitType>('small_group')
  const [newUnitGroupId, setNewUnitGroupId] = useState('')

  const [addingMemberToUnit, setAddingMemberToUnit] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>('sub_leader')

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
  })

  const { data: ministryUnits, isLoading: unitsLoading } = useQuery({
    queryKey: ['ministryUnits'],
    queryFn: getMinistryUnits,
  })

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: getMembers,
  })

  const isLoading = groupsLoading || unitsLoading || membersLoading

  useWindowScrollRestoration(ADMIN_SCROLL_STORAGE_KEY, {
    isReady: !isLoading,
    resetOnEnter: true,
    resetOnReload: true,
    restoreOnPop: true,
  })

  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setNewGroupName('')
      setShowAddGroup(false)
    },
  })

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateGroup(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setEditingGroup(null)
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['ministryUnits'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const createUnitMutation = useMutation({
    mutationFn: createMinistryUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ministryUnits'] })
      setAddingUnitScope(null)
      setNewUnitName('')
      setNewUnitType('small_group')
      setNewUnitGroupId('')
    },
  })

  const updateUnitMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<MinistryUnit, 'group_id' | 'unit_type' | 'name'>>
    }) => updateMinistryUnit(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['ministryUnits'] })
      setEditingUnit(null)
    },
  })

  const deleteUnitMutation = useMutation({
    mutationFn: deleteMinistryUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['ministryUnits'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const createMemberMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setAddingMemberToUnit(null)
      setNewMemberName('')
      setNewMemberRole('sub_leader')
    },
    onError: (error) => {
      console.error('Failed to create member:', error)
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      alert(`멤버 추가에 실패했습니다.\n${message}`)
    },
  })

  const deleteMemberMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const sortedGroups = useMemo(() => sortGroups(groups ?? []), [groups])
  const sortedUnits = useMemo(() => sortMinistryUnits(ministryUnits ?? []), [ministryUnits])

  const membersByUnit = useMemo(() => {
    const grouped = new Map<string, Member[]>()

    for (const unit of sortedUnits) {
      const unitMembers = sortMembers((members ?? []).filter((member) => member.ministry_unit_id === unit.id))
      grouped.set(unit.id, unitMembers)
    }

    return grouped
  }, [members, sortedUnits])

  const rootUnits = useMemo(
    () => sortedUnits.filter((unit) => isRootMinistryUnit(unit) && unit.unit_type !== 'small_group'),
    [sortedUnits]
  )

  const ungroupedSmallGroups = useMemo(
    () => sortedUnits.filter(isUngroupedSmallGroup),
    [sortedUnits]
  )

  const getMembersByUnit = (unitId: string) => membersByUnit.get(unitId) ?? []

  const tabs = useMemo<AdminTab[]>(
    () => [
      ...sortedGroups.map((group) => {
        const units = sortedUnits.filter((unit) => unit.group_id === group.id)

        return {
          id: `group:${group.id}`,
          kind: 'group' as const,
          label: group.name,
          group,
          units,
          memberCount: units.reduce(
            (total, unit) => total + (membersByUnit.get(unit.id)?.length ?? 0),
            0
          ),
        }
      }),
      {
        id: 'root:community',
        kind: 'root' as const,
        label: '공동체',
        rootUnits,
        ungroupedSmallGroups,
        memberCount: [...rootUnits, ...ungroupedSmallGroups].reduce(
          (total, unit) => total + (membersByUnit.get(unit.id)?.length ?? 0),
          0
        ),
      },
    ],
    [membersByUnit, rootUnits, sortedGroups, sortedUnits, ungroupedSmallGroups]
  )

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (tabs.length === 0) {
      setActiveTabId(null)
      return
    }

    setActiveTabId((current) => {
      if (current && tabs.some((tab) => tab.id === current)) {
        return current
      }

      return tabs[0].id
    })
  }, [isLoading, setActiveTabId, tabs])

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null,
    [activeTabId, tabs]
  )
  const activeGroupTab = activeTab?.kind === 'group' ? activeTab : null
  const activeCommunityTab = activeTab?.kind === 'root' ? activeTab : null

  const handleSelectTab = (tabId: string) => {
    const hasTabChanged = activeTabId !== tabId
    setActiveTabId(tabId)

    if (hasTabChanged) {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }

  const isUnitSectionExpanded = (unitId: string) => expandedUnitSections[unitId] ?? false

  const setUnitSectionExpanded = (unitId: string, isExpanded: boolean) => {
    setExpandedUnitSections((current) => ({
      ...current,
      [unitId]: isExpanded,
    }))
  }

  const resetMemberForm = () => {
    setNewMemberName('')
    setNewMemberRole('sub_leader')
  }

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroupMutation.mutate(newGroupName.trim())
    }
  }

  const handleStartEditGroup = (group: Group) => {
    setEditingGroup(group)
    setEditGroupName(group.name)
  }

  const handleSaveEditGroup = () => {
    if (editingGroup && editGroupName.trim()) {
      updateGroupMutation.mutate({ id: editingGroup.id, name: editGroupName.trim() })
    }
  }

  const handleDeleteGroup = (group: Group) => {
    if (
      confirm(
        `"${group.name}" 그룹을 삭제하시겠습니까?\n소속된 모든 단위와 멤버도 함께 삭제됩니다.`
      )
    ) {
      deleteGroupMutation.mutate(group.id)
    }
  }

  const handleStartAddUnitToGroup = (groupId: string) => {
    setAddingUnitScope({ kind: 'group', groupId })
    setNewUnitName('')
    setNewUnitType('small_group')
    setNewUnitGroupId(groupId)
  }

  const handleStartAddRootUnit = () => {
    setAddingUnitScope({ kind: 'root' })
    setNewUnitName('')
    setNewUnitType('pastor_team')
    setNewUnitGroupId('')
  }

  const handleCreateUnit = () => {
    if (!newUnitName.trim() || !addingUnitScope) return

    const groupId =
      addingUnitScope.kind === 'group'
        ? addingUnitScope.groupId
        : isGroupAssignableUnitType(newUnitType)
          ? newUnitGroupId || null
          : null

    createUnitMutation.mutate({
      name: newUnitName.trim(),
      unit_type: newUnitType,
      group_id: groupId,
    })
  }

  const handleStartEditUnit = (unit: MinistryUnit) => {
    setUnitSectionExpanded(unit.id, true)
    setEditingUnit(unit)
    setEditUnitName(unit.name)
    setEditUnitType(unit.unit_type)
    setEditUnitGroupId(unit.group_id ?? '')
  }

  const handleSaveEditUnit = () => {
    if (!editingUnit || !editUnitName.trim()) return

    updateUnitMutation.mutate({
      id: editingUnit.id,
      updates: {
        name: editUnitName.trim(),
        unit_type: editUnitType,
        group_id: isGroupAssignableUnitType(editUnitType) ? editUnitGroupId || null : null,
      },
    })
  }

  const handleDeleteUnit = (unit: MinistryUnit) => {
    if (
      confirm(
        `"${unit.name}" 소속 단위를 삭제하시겠습니까?\n소속된 멤버도 함께 삭제됩니다.`
      )
    ) {
      deleteUnitMutation.mutate(unit.id)
    }
  }

  const handleStartAddMember = (unit: MinistryUnit) => {
    setUnitSectionExpanded(unit.id, true)
    setAddingMemberToUnit(unit.id)
    setNewMemberName('')
    setNewMemberRole(normalizeSelectableMemberRole(getDefaultMemberRoleForUnit(unit.unit_type)))
  }

  const handleCreateMember = (unit: MinistryUnit) => {
    if (!newMemberName.trim()) return

    const memberType = getDefaultMemberTypeForUnit(unit.unit_type)

    createMemberMutation.mutate({
      ministry_unit_id: unit.id,
      name: newMemberName.trim(),
      member_type: memberType,
      member_role: usesSelectableMemberRole(memberType)
        ? normalizeSelectableMemberRole(newMemberRole)
        : 'member',
    })
  }

  const handleDeleteMember = (member: Member) => {
    if (confirm(`"${member.name}" 멤버를 삭제하시겠습니까?`)) {
      deleteMemberMutation.mutate(member.id)
    }
  }

  const renderUnitCard = (unit: MinistryUnit, accentClassName = 'bg-gray-50 border-gray-100') => {
    const unitMembers = getMembersByUnit(unit.id)
    const isEditingThisUnit = editingUnit?.id === unit.id
    const hasInlineFormOpen = addingMemberToUnit === unit.id
    const isSectionExpanded = isEditingThisUnit || hasInlineFormOpen || isUnitSectionExpanded(unit.id)
    const unitIcon = MINISTRY_UNIT_TYPE_ICONS[isEditingThisUnit ? editUnitType : unit.unit_type]

    return (
      <div key={unit.id} className={`rounded-2xl border p-3 sm:p-4 ${accentClassName}`}>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setUnitSectionExpanded(unit.id, !isSectionExpanded)}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
            aria-expanded={isSectionExpanded}
          >
            <span className="material-icons-outlined mt-0.5 text-gray-400">{unitIcon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{unit.name}</h3>
                <span className="text-sm text-gray-400">({unitMembers.length}명)</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{formatMinistryUnitPath(unit)}</p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {!isEditingThisUnit && (
              <>
                <button
                  onClick={() => handleStartEditUnit(unit)}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <span className="material-icons-outlined text-sm">edit</span>
                  수정
                </button>
                <button
                  onClick={() => handleDeleteUnit(unit)}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <span className="material-icons-outlined text-sm">delete</span>
                  삭제
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setUnitSectionExpanded(unit.id, !isSectionExpanded)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 p-1.5 text-slate-400 shadow-sm transition-colors hover:bg-white hover:text-slate-600"
              aria-label={isSectionExpanded ? '섹션 접기' : '섹션 펼치기'}
            >
              <span
                className={`material-icons-outlined text-2xl transition-transform ${
                  isSectionExpanded ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
          </div>
        </div>

        {isSectionExpanded && (
          <div className="mt-4 space-y-2 border-t border-white/70 pt-4">
            {isEditingThisUnit ? (
              <div className="mb-4 space-y-3">
                <input
                  type="text"
                  value={editUnitName}
                  onChange={(e) => setEditUnitName(e.target.value)}
                  className="input"
                  autoFocus
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={editUnitType}
                    onChange={(e) => setEditUnitType(e.target.value as MinistryUnitType)}
                    className="input"
                  >
                    <option value="small_group">{MINISTRY_UNIT_TYPE_LABELS.small_group}</option>
                    <option value="pastor_team">{MINISTRY_UNIT_TYPE_LABELS.pastor_team}</option>
                    <option value="mc_team">{MINISTRY_UNIT_TYPE_LABELS.mc_team}</option>
                  </select>
                  {isGroupAssignableUnitType(editUnitType) && (
                    <select
                      value={editUnitGroupId}
                      onChange={(e) => setEditUnitGroupId(e.target.value)}
                      className="input"
                    >
                      <option value="">{getUnitGroupPlaceholder(editUnitType)}</option>
                      {sortedGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEditUnit} className="btn-primary text-sm">
                    저장
                  </button>
                  <button onClick={() => setEditingUnit(null)} className="btn-secondary text-sm">
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            {unitMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/90"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="material-icons-outlined text-gray-400 text-lg">person</span>
                  <span className="font-medium text-gray-900">{member.name}</span>
                  {getMemberBadges(member).map((badge) => (
                    <span
                      key={badge.key}
                      className="chip text-xs py-0.5 px-2 inline-flex items-center gap-1"
                    >
                      <span className="material-icons text-xs leading-none">{badge.icon}</span>
                      {badge.label}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/member/${member.id}/edit`}
                    state={createReturnToState(location.pathname, location.search, location.hash)}
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

            {unitMembers.length === 0 && !hasInlineFormOpen && (
              <p className="py-4 text-center text-sm text-gray-400">아직 멤버가 없습니다</p>
            )}

            {hasInlineFormOpen ? (
              <div className="space-y-3 rounded-lg border border-blue-100 bg-white p-4">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="이름"
                  className="input"
                  autoFocus
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  {usesSelectableMemberRole(getDefaultMemberTypeForUnit(unit.unit_type)) ? (
                    <select
                      value={newMemberRole}
                      onChange={(e) =>
                        setNewMemberRole(normalizeSelectableMemberRole(e.target.value as MemberRole))
                      }
                      className="input"
                    >
                      <option value="leader">{MEMBER_ROLE_LABELS.leader}</option>
                      <option value="sub_leader">{MEMBER_ROLE_LABELS.sub_leader}</option>
                      <option value="group_leadership">{MEMBER_ROLE_LABELS.group_leadership}</option>
                    </select>
                  ) : (
                    <div className="input flex items-center text-gray-500">
                      멤버 종류와 직책은 소속에 따라 자동으로 저장됩니다
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCreateMember(unit)}
                    disabled={!newMemberName.trim() || createMemberMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setAddingMemberToUnit(null)
                      resetMemberForm()
                    }}
                    className="btn-secondary text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleStartAddMember(unit)}
                className="flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-200 p-3 text-sm text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600"
              >
                <span className="material-icons-outlined text-lg">person_add</span>
                새 멤버 추가
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">관리</h1>

      <div className="space-y-5 sm:space-y-6">
        {tabs.length > 0 && activeTab && (
          <div className="sticky top-16 z-20 -mx-4 bg-gradient-to-b from-gray-50 via-gray-50/95 to-transparent px-4 pb-2 pt-1 sm:top-20 sm:-mx-6 sm:px-6">
            <div className="overflow-x-auto no-scrollbar">
              <div className="inline-flex min-w-full gap-2 rounded-3xl border border-slate-200 bg-white/90 p-2 shadow-sm backdrop-blur sm:min-w-0">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTab.id

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      className={`flex min-w-[6.5rem] items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition-all sm:min-w-[7.5rem] ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeGroupTab ? (
          <div className="card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              {editingGroup?.id === activeGroupTab.group.id ? (
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
                  <button onClick={() => setEditingGroup(null)} className="btn-secondary text-sm">
                    취소
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="material-icons-outlined text-gray-400">account_tree</span>
                    <h2 className="text-lg font-semibold text-gray-900">{activeGroupTab.group.name}</h2>
                    <span className="text-sm text-gray-400">
                      ({activeGroupTab.units.length}개 소속 / {activeGroupTab.memberCount}명)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEditGroup(activeGroupTab.group)}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <span className="material-icons-outlined text-sm">edit</span>
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(activeGroupTab.group)}
                      className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <span className="material-icons-outlined text-sm">delete</span>
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              {activeGroupTab.units.length > 0 ? (
                activeGroupTab.units.map((unit) => renderUnitCard(unit))
              ) : (
                <div className="text-center py-6 text-gray-400 rounded-2xl border border-dashed border-gray-200">
                  <span className="material-icons-outlined text-3xl mb-2">folder_off</span>
                  <p className="text-sm">아직 연결된 소속이 없습니다</p>
                </div>
              )}

              {addingUnitScope?.kind === 'group' &&
              addingUnitScope.groupId === activeGroupTab.group.id ? (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-3">
                  <input
                    type="text"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="소속 이름"
                    className="input"
                    autoFocus
                  />
                  <select
                    value={newUnitType}
                    onChange={(e) => setNewUnitType(e.target.value as MinistryUnitType)}
                    className="input"
                  >
                    <option value="small_group">{MINISTRY_UNIT_TYPE_LABELS.small_group}</option>
                    <option value="pastor_team">{MINISTRY_UNIT_TYPE_LABELS.pastor_team}</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateUnit}
                      disabled={!newUnitName.trim() || createUnitMutation.isPending}
                      className="btn-primary text-sm"
                    >
                      추가
                    </button>
                    <button onClick={() => setAddingUnitScope(null)} className="btn-secondary text-sm">
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleStartAddUnitToGroup(activeGroupTab.group.id)}
                  className="w-full p-3 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center gap-1 text-sm"
                >
                  <span className="material-icons-outlined text-lg">group_add</span>
                  새 소속 추가
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {activeCommunityTab && activeCommunityTab.ungroupedSmallGroups.length > 0 && (
              <div className="card border border-amber-200">
                <div className="mb-4 pb-3 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined text-amber-500">warning_amber</span>
                    <h2 className="text-lg font-semibold text-gray-900">그룹 미지정 다락방</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    마이그레이션 직후의 다락방이나 아직 그룹이 정해지지 않은 다락방입니다.
                  </p>
                </div>
                <div className="space-y-4">
                  {activeCommunityTab.ungroupedSmallGroups.map((unit) =>
                    renderUnitCard(unit, 'bg-amber-50/70 border-amber-100')
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <div className="mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="material-icons-outlined text-gray-400">hub</span>
                  <h2 className="text-lg font-semibold text-gray-900">공동체</h2>
                  <span className="text-sm text-gray-400">
                    ({activeCommunityTab?.rootUnits.length ?? 0}개 소속 / {activeCommunityTab?.memberCount ?? 0}명)
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {activeCommunityTab && activeCommunityTab.rootUnits.length > 0 ? (
                  activeCommunityTab.rootUnits.map((unit) => renderUnitCard(unit))
                ) : (
                  <div className="text-center py-6 text-gray-400 rounded-2xl border border-dashed border-gray-200">
                    <span className="material-icons-outlined text-3xl mb-2">folder_off</span>
                    <p className="text-sm">등록된 공동체가 없습니다</p>
                  </div>
                )}

                {addingUnitScope?.kind === 'root' ? (
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-3">
                    <input
                      type="text"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      placeholder="소속 이름"
                      className="input"
                      autoFocus
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={newUnitType}
                        onChange={(e) => setNewUnitType(e.target.value as MinistryUnitType)}
                        className="input"
                      >
                        <option value="pastor_team">{MINISTRY_UNIT_TYPE_LABELS.pastor_team}</option>
                        <option value="mc_team">{MINISTRY_UNIT_TYPE_LABELS.mc_team}</option>
                        <option value="small_group">그룹 미지정 다락방</option>
                      </select>
                      {isGroupAssignableUnitType(newUnitType) && (
                        <select
                          value={newUnitGroupId}
                          onChange={(e) => setNewUnitGroupId(e.target.value)}
                          className="input"
                        >
                          <option value="">{getUnitGroupPlaceholder(newUnitType)}</option>
                          {sortedGroups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateUnit}
                        disabled={!newUnitName.trim() || createUnitMutation.isPending}
                        className="btn-primary text-sm"
                      >
                        추가
                      </button>
                      <button onClick={() => setAddingUnitScope(null)} className="btn-secondary text-sm">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleStartAddRootUnit}
                    className="w-full p-3 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center gap-1 text-sm"
                  >
                    <span className="material-icons-outlined text-lg">add</span>
                    새 소속 추가
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showAddGroup ? (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="material-icons-outlined text-gray-400">add_circle</span>
              새 그룹 추가
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="그룹 이름"
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
