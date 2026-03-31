export interface Group {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MinistryUnitType = 'small_group' | 'pastor_team' | 'mc_team'

export interface MinistryUnit {
  id: string
  group_id: string | null
  unit_type: MinistryUnitType
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  group?: Group | null
}

export interface PhotoPosition {
  x: number
  y: number
  zoom?: number
}

export type MemberType = 'regular' | 'pastor' | 'mc'
export type MemberRole = 'member' | 'leader' | 'sub_leader'

export interface Member {
  id: string
  ministry_unit_id: string
  name: string
  member_type: MemberType
  member_role: MemberRole
  photo_url: string | null
  photo_position: PhotoPosition
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  ministry_unit?: MinistryUnit | null
  prayer_requests?: PrayerRequest[]
}

export interface PrayerRequest {
  id: string
  member_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Settings {
  key: string
  value: string
}

export const MINISTRY_UNIT_TYPE_LABELS: Record<MinistryUnitType, string> = {
  small_group: '다락방',
  pastor_team: '교역자',
  mc_team: 'MC단',
}

export const MINISTRY_UNIT_TYPE_ICONS: Record<MinistryUnitType, string> = {
  small_group: 'groups',
  pastor_team: 'church',
  mc_team: 'mic',
}

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  regular: '일반',
  pastor: '교역자',
  mc: 'MC',
}

export const MEMBER_TYPE_ICONS: Record<MemberType, string> = {
  regular: 'person',
  pastor: 'star',
  mc: 'mic',
}

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  member: '멤버',
  leader: '다락방장',
  sub_leader: '순장',
}

export const MEMBER_ROLE_ICONS: Record<MemberRole, string> = {
  member: 'person',
  leader: 'groups',
  sub_leader: 'person',
}
