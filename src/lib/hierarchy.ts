import type {
  Group,
  Member,
  MemberRole,
  MemberType,
  MinistryUnit,
  MinistryUnitType,
} from '@/types'
import {
  MEMBER_ROLE_ICONS,
  MEMBER_ROLE_LABELS,
  MEMBER_TYPE_ICONS,
  MEMBER_TYPE_LABELS,
} from '@/types'

export interface MemberBadge {
  icon: string
  key: string
  label: string
}

const compareKoreanText = (left: string, right: string) => left.localeCompare(right, 'ko')

const PREFERRED_GROUP_ORDER = ['프렌드', '씨드', '노크']

const getGroupOrderPriority = (groupName: string) => {
  const index = PREFERRED_GROUP_ORDER.indexOf(groupName)
  return index === -1 ? PREFERRED_GROUP_ORDER.length : index
}

const getMinistryUnitSortPriority = (unitType: MinistryUnitType) => {
  switch (unitType) {
    case 'small_group':
      return 0
    case 'pastor_team':
      return 1
    case 'mc_team':
      return 2
    default:
      return 9
  }
}

export const sortGroups = (groups: Group[]) =>
  [...groups].sort(
    (a, b) =>
      getGroupOrderPriority(a.name) - getGroupOrderPriority(b.name) ||
      a.sort_order - b.sort_order ||
      compareKoreanText(a.name, b.name)
  )

export const sortMinistryUnits = (units: MinistryUnit[]) =>
  [...units].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      getMinistryUnitSortPriority(a.unit_type) - getMinistryUnitSortPriority(b.unit_type) ||
      compareKoreanText(a.name, b.name)
  )

export const getMemberSortPriority = (
  member: Pick<Member, 'member_type' | 'member_role'>
) => {
  if (member.member_type === 'pastor') return 0
  if (member.member_role === 'group_leadership') return 1
  if (member.member_role === 'leader') return 2
  if (member.member_role === 'sub_leader') return 3
  if (member.member_type === 'mc') return 4
  return 5
}

export const sortMembers = (members: Member[]) =>
  [...members].sort(
    (a, b) =>
      getMemberSortPriority(a) - getMemberSortPriority(b) ||
      a.sort_order - b.sort_order ||
      compareKoreanText(a.name, b.name)
  )

export const getMemberBadges = (
  member: Pick<Member, 'member_type' | 'member_role'>
): MemberBadge[] => {
  const badges: MemberBadge[] = []

  if (member.member_type !== 'regular') {
    badges.push({
      icon: MEMBER_TYPE_ICONS[member.member_type],
      key: `member_type:${member.member_type}`,
      label: MEMBER_TYPE_LABELS[member.member_type],
    })
  }

  if (member.member_role !== 'member') {
    badges.push({
      icon: MEMBER_ROLE_ICONS[member.member_role],
      key: `member_role:${member.member_role}`,
      label: MEMBER_ROLE_LABELS[member.member_role],
    })
  }

  if (badges.length === 0) {
    badges.push({
      icon: MEMBER_ROLE_ICONS.member,
      key: 'member_role:member',
      label: MEMBER_ROLE_LABELS.member,
    })
  }

  return badges
}

export const formatMinistryUnitPath = (unit?: MinistryUnit | null) => {
  if (!unit) return ''
  return unit.group?.name ? `${unit.group.name} · ${unit.name}` : unit.name
}

export const getDefaultMemberTypeForUnit = (unitType: MinistryUnitType): MemberType => {
  switch (unitType) {
    case 'pastor_team':
      return 'pastor'
    case 'mc_team':
      return 'mc'
    case 'small_group':
    default:
      return 'regular'
  }
}

export const getDefaultMemberRoleForUnit = (unitType: MinistryUnitType): MemberRole => {
  switch (unitType) {
    case 'pastor_team':
    case 'mc_team':
      return 'member'
    case 'small_group':
    default:
      return 'sub_leader'
  }
}

export const isRootMinistryUnit = (unit: MinistryUnit) => unit.group_id === null

export const isUngroupedSmallGroup = (unit: MinistryUnit) =>
  unit.unit_type === 'small_group' && unit.group_id === null
