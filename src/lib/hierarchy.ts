import type {
  Group,
  Member,
  MemberRole,
  MinistryUnit,
  MinistryUnitType,
} from '@/types'
import {
  MEMBER_ROLE_ICONS,
  MEMBER_ROLE_LABELS,
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
    case 'group_leadership':
      return 0
    case 'pastor_team':
      return 1
    case 'small_group':
      return 2
    case 'mc_team':
      return 3
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
  member: Pick<Member, 'member_role'>
) => {
  switch (member.member_role) {
    case 'pastor':
      return 0
    case 'leader':
      return 1
    case 'sub_leader':
      return 2
    case 'mc':
      return 3
    default:
      return 9
  }
}

export const sortMembers = (members: Member[]) =>
  [...members].sort(
    (a, b) =>
      getMemberSortPriority(a) - getMemberSortPriority(b) ||
      a.sort_order - b.sort_order ||
      compareKoreanText(a.name, b.name)
  )

export const getMemberBadges = (
  member: Pick<Member, 'member_role'>
): MemberBadge[] => [
  {
    icon: MEMBER_ROLE_ICONS[member.member_role],
    key: `member_role:${member.member_role}`,
    label: MEMBER_ROLE_LABELS[member.member_role],
  },
]

export const formatMinistryUnitPath = (unit?: MinistryUnit | null) => {
  if (!unit) return ''
  return unit.group?.name ? `${unit.group.name} · ${unit.name}` : unit.name
}

export const getDefaultMemberRoleForUnit = (unitType: MinistryUnitType): MemberRole => {
  switch (unitType) {
    case 'pastor_team':
      return 'pastor'
    case 'mc_team':
      return 'mc'
    case 'group_leadership':
      return 'leader'
    case 'small_group':
    default:
      return 'sub_leader'
  }
}

export const getAvailableMemberRolesForUnit = (unitType: MinistryUnitType): MemberRole[] => {
  switch (unitType) {
    case 'small_group':
      return ['leader', 'sub_leader']
    case 'pastor_team':
      return ['pastor']
    case 'mc_team':
      return ['mc']
    case 'group_leadership':
      return ['leader', 'sub_leader', 'pastor', 'mc']
    default:
      return ['sub_leader']
  }
}

export const normalizeMemberRoleForUnit = (
  memberRole: MemberRole,
  unitType: MinistryUnitType
): MemberRole => {
  const availableRoles = getAvailableMemberRolesForUnit(unitType)
  return availableRoles.includes(memberRole) ? memberRole : availableRoles[0]
}

export const isRoleFixedForUnit = (unitType: MinistryUnitType) =>
  getAvailableMemberRolesForUnit(unitType).length === 1

export const isRootMinistryUnit = (unit: MinistryUnit) => unit.group_id === null

export const isUngroupedSmallGroup = (unit: MinistryUnit) =>
  unit.unit_type === 'small_group' && unit.group_id === null
