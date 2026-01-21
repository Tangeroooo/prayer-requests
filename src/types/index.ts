export interface SmallGroup {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  small_group_id: string
  name: string
  role: 'leader' | 'sub_leader'
  photo_url: string | null
  photo_position: PhotoPosition
  created_at: string
  updated_at: string
  small_group?: SmallGroup
  prayer_requests?: PrayerRequest[]
}

export interface PhotoPosition {
  x: number
  y: number
  zoom?: number // 1 = 100%, 2 = 200%
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

export type MemberRole = 'leader' | 'sub_leader'

export const ROLE_LABELS: Record<MemberRole, string> = {
  leader: '다락방장',
  sub_leader: '순장',
}
