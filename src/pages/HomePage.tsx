import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGroups, getMembers, getMinistryUnits } from '@/lib/api'
import { isUngroupedSmallGroup, sortGroups, sortMembers, sortMinistryUnits } from '@/lib/hierarchy'
import type { Member, MinistryUnit } from '@/types'
import { MINISTRY_UNIT_TYPE_ICONS } from '@/types'
import Layout from '@/components/Layout'
import MemberCard from '@/components/MemberCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { DocumentIcon, SparklesIcon } from '@/components/Icons'
import {
  useSessionStorageState,
  useScopedWindowScrollRestoration,
} from '@/hooks/useScrollRestoration'

interface UnitSection {
  unit: MinistryUnit
  members: Member[]
}

const getGroupTabUnitPriority = (unit: MinistryUnit) => {
  switch (unit.unit_type) {
    case 'pastor_team':
      return 0
    case 'small_group':
      return 1
    case 'mc_team':
      return 2
    default:
      return 9
  }
}

interface GroupTab {
  id: string
  kind: 'group'
  label: string
  memberCount: number
  sectionCount: number
  recentMembers: Member[]
  units: UnitSection[]
}

interface RootTab {
  id: string
  kind: 'root'
  label: string
  memberCount: number
  sectionCount: number
  recentMembers: Member[]
  rootUnits: UnitSection[]
  ungroupedSmallGroups: UnitSection[]
}

type HomeTab = GroupTab | RootTab

const HOME_ACTIVE_TAB_STORAGE_KEY = 'home-page:active-tab'
const HOME_SCROLL_STORAGE_KEY = 'home-page'

export default function HomePage() {
  const [activeTabId, setActiveTabId] = useSessionStorageState<string | null>(
    HOME_ACTIVE_TAB_STORAGE_KEY,
    null
  )

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: getMembers,
  })

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
  })

  const { data: ministryUnits, isLoading: unitsLoading } = useQuery({
    queryKey: ['ministryUnits'],
    queryFn: getMinistryUnits,
  })

  const isLoading = membersLoading || groupsLoading || unitsLoading

  const recentMembers = useMemo(() => {
    if (!members) return []

    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    return members
      .filter((member) => new Date(member.updated_at) >= twoWeeksAgo)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [members])

  const groupSections = useMemo(() => {
    if (!groups || !ministryUnits || !members) return []

    return sortGroups(groups).map((group) => {
      const units = sortMinistryUnits(
        ministryUnits.filter((unit) => unit.group_id === group.id)
      )
        .sort(
          (a, b) =>
            getGroupTabUnitPriority(a) - getGroupTabUnitPriority(b) ||
            a.sort_order - b.sort_order ||
            a.name.localeCompare(b.name, 'ko')
        )
        .map((unit) => ({
        unit,
        members: sortMembers(members.filter((member) => member.ministry_unit_id === unit.id)),
      }))

      return {
        group,
        units,
      }
    })
  }, [groups, ministryUnits, members])

  const rootUnitSections = useMemo(() => {
    if (!ministryUnits || !members) return []

    return sortMinistryUnits(
      ministryUnits.filter((unit) => unit.group_id === null && unit.unit_type !== 'small_group')
    ).map((unit) => ({
      unit,
      members: sortMembers(members.filter((member) => member.ministry_unit_id === unit.id)),
    }))
  }, [members, ministryUnits])

  const ungroupedSmallGroupSections = useMemo(() => {
    if (!ministryUnits || !members) return []

    return sortMinistryUnits(ministryUnits.filter(isUngroupedSmallGroup)).map((unit) => ({
      unit,
      members: sortMembers(members.filter((member) => member.ministry_unit_id === unit.id)),
    }))
  }, [members, ministryUnits])

  const tabs = useMemo<HomeTab[]>(() => {
    const groupTabs: GroupTab[] = groupSections.map(({ group, units }) => {
      const tabMemberIds = new Set(units.flatMap(({ members: unitMembers }) => unitMembers.map((member) => member.id)))

      return {
        id: `group:${group.id}`,
        kind: 'group',
        label: group.name,
        memberCount: units.reduce((total, section) => total + section.members.length, 0),
        sectionCount: units.length,
        recentMembers: recentMembers.filter((member) => tabMemberIds.has(member.id)),
        units,
      }
    })

    const hasRootTab = rootUnitSections.length > 0 || ungroupedSmallGroupSections.length > 0

    if (!hasRootTab) {
      return groupTabs
    }

    const rootMemberIds = new Set(
      [...rootUnitSections, ...ungroupedSmallGroupSections].flatMap(({ members: unitMembers }) =>
        unitMembers.map((member) => member.id)
      )
    )

    return [
      ...groupTabs,
      {
        id: 'root:community',
        kind: 'root',
        label: '공동체',
        memberCount: [...rootUnitSections, ...ungroupedSmallGroupSections].reduce(
          (total, section) => total + section.members.length,
          0
        ),
        sectionCount: rootUnitSections.length + ungroupedSmallGroupSections.length,
        recentMembers: recentMembers.filter((member) => rootMemberIds.has(member.id)),
        rootUnits: rootUnitSections,
        ungroupedSmallGroups: ungroupedSmallGroupSections,
      },
    ]
  }, [groupSections, recentMembers, rootUnitSections, ungroupedSmallGroupSections])

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

  useScopedWindowScrollRestoration(HOME_SCROLL_STORAGE_KEY, activeTab?.id ?? null, {
    isReady: !isLoading,
    fallbackScrollY: 0,
  })

  const activeRecentMemberIds = useMemo(
    () => new Set(activeTab?.recentMembers.map((member) => member.id) ?? []),
    [activeTab]
  )

  const hasAnyHierarchySection = tabs.length > 0

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId)
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
      {hasAnyHierarchySection && activeTab ? (
        <div className="space-y-5 sm:space-y-6">
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

          {activeTab.recentMembers.length > 0 && (
            <section className="rounded-3xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <SparklesIcon className="text-xl text-blue-500" />
                최근 업데이트
                <span className="text-sm font-normal text-gray-400">
                  {activeTab.label} · 최근 2주
                </span>
              </h2>
              <div className="space-y-3">
                {activeTab.recentMembers.map((member, index) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isRecent
                    showHierarchy={activeTab.kind === 'root'}
                    index={index}
                  />
                ))}
              </div>
            </section>
          )}

          {activeTab.kind === 'group' ? (
            activeTab.units.length > 0 ? (
              <div className="space-y-4">
                {activeTab.units.map(({ unit, members: unitMembers }) => (
                  <UnitPanel
                    key={unit.id}
                    title={unit.name}
                    icon={MINISTRY_UNIT_TYPE_ICONS[unit.unit_type]}
                    members={unitMembers}
                    recentMemberIds={activeRecentMemberIds}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="folder_off"
                title="아직 연결된 소속이 없습니다"
                description="관리자 화면에서 이 그룹 아래 다락방이나 교역자 소속을 추가해주세요."
              />
            )
          ) : (
            <div className="space-y-5">
              {activeTab.rootUnits.length > 0 ? (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <span className="material-icons-outlined text-xl text-gray-400">hub</span>
                    공동체
                  </h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {activeTab.rootUnits.map(({ unit, members: unitMembers }) => (
                      <UnitPanel
                        key={unit.id}
                        title={unit.name}
                        icon={MINISTRY_UNIT_TYPE_ICONS[unit.unit_type]}
                        members={unitMembers}
                        recentMemberIds={activeRecentMemberIds}
                        showHierarchy
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {activeTab.ungroupedSmallGroups.length > 0 && (
                <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-3 sm:p-4">
                  <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <span className="material-icons-outlined text-xl text-amber-500">warning_amber</span>
                    그룹 미지정 다락방
                  </h2>
                  <p className="mb-4 text-sm text-gray-500">
                    아직 상위 그룹이 연결되지 않은 다락방입니다. 관리자 화면에서 그룹을 지정할 수 있습니다.
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {activeTab.ungroupedSmallGroups.map(({ unit, members: unitMembers }) => (
                      <UnitPanel
                        key={unit.id}
                        title={unit.name}
                        icon="groups"
                        members={unitMembers}
                        recentMemberIds={activeRecentMemberIds}
                        accentClassName="border-amber-100 bg-white/85"
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
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
            관리자 페이지에서 그룹, 소속 단위, 멤버를 추가해주세요
          </p>
        </div>
      )}
    </Layout>
  )
}

function UnitPanel({
  title,
  icon,
  members,
  recentMemberIds,
  accentClassName = 'border-gray-200 bg-white',
  showHierarchy = false,
}: {
  title: string
  icon: string
  members: Member[]
  recentMemberIds: Set<string>
  accentClassName?: string
  showHierarchy?: boolean
}) {
  return (
    <section className={`rounded-3xl border p-3 sm:p-4 ${accentClassName}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className="material-icons-outlined text-lg text-gray-400">{icon}</span>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-400">{members.length}명</span>
      </div>

      {members.length > 0 ? (
        <div className="space-y-3">
          {members.map((member, index) => (
            <MemberCard
              key={member.id}
              member={member}
              index={index}
              isRecent={recentMemberIds.has(member.id)}
              showHierarchy={showHierarchy}
            />
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-gray-400">
          <span className="material-icons-outlined mb-2 text-3xl">person_off</span>
          <p className="text-sm">아직 멤버가 없습니다</p>
        </div>
      )}
    </section>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-200 bg-white/70 py-10 text-center text-gray-400">
      <span className="material-icons-outlined mb-3 text-4xl">{icon}</span>
      <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  )
}
