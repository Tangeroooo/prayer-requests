import { supabase } from './supabase'
import type {
  Group,
  Member,
  MemberRole,
  MinistryUnit,
  MinistryUnitType,
  PhotoPosition,
  PrayerRequest,
} from '@/types'

const MEMBER_SELECT = `
  *,
  ministry_unit:ministry_units(
    *,
    group:groups(*)
  ),
  prayer_requests(*)
`

const sortPrayerRequests = <T extends { created_at: string }>(requests?: T[] | null): T[] =>
  [...(requests ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

type LegacyMemberType = 'regular' | 'pastor' | 'mc'

type StoredMemberRole = MemberRole | 'member'

type MemberRecord = Omit<Member, 'member_role'> & {
  member_role?: StoredMemberRole | null
  member_type?: LegacyMemberType | null
}

const normalizeMemberRole = (member: MemberRecord): MemberRole => {
  if (
    member.member_role === 'leader' ||
    member.member_role === 'sub_leader' ||
    member.member_role === 'pastor' ||
    member.member_role === 'mc'
  ) {
    return member.member_role
  }

  if (member.member_type === 'pastor') return 'pastor'
  if (member.member_type === 'mc') return 'mc'
  return 'sub_leader'
}

const getLegacyMemberType = (memberRole: MemberRole): LegacyMemberType =>
  memberRole === 'pastor' ? 'pastor' : memberRole === 'mc' ? 'mc' : 'regular'

const normalizeMember = (member: MemberRecord): Member => ({
  ...member,
  member_role: normalizeMemberRole(member),
  prayer_requests: sortPrayerRequests(member.prayer_requests),
})

export const getGroups = async (): Promise<Group[]> => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('sort_order')
    .order('name')

  if (error) throw error
  return (data ?? []) as Group[]
}

export const createGroup = async (name: string): Promise<Group> => {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name })
    .select()
    .single()

  if (error) throw error
  return data as Group
}

export const updateGroup = async (id: string, name: string): Promise<Group> => {
  const { data, error } = await supabase
    .from('groups')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Group
}

export const deleteGroup = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const getMinistryUnits = async (): Promise<MinistryUnit[]> => {
  const { data, error } = await supabase
    .from('ministry_units')
    .select(`
      *,
      group:groups(*)
    `)
    .order('sort_order')
    .order('name')

  if (error) throw error
  return (data ?? []) as MinistryUnit[]
}

export const createMinistryUnit = async (unit: {
  group_id?: string | null
  unit_type: MinistryUnitType
  name: string
}): Promise<MinistryUnit> => {
  const { data, error } = await supabase
    .from('ministry_units')
    .insert({
      ...unit,
      group_id: unit.group_id ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as MinistryUnit
}

export const updateMinistryUnit = async (
  id: string,
  updates: Partial<Pick<MinistryUnit, 'group_id' | 'unit_type' | 'name' | 'sort_order' | 'is_active'>>
): Promise<MinistryUnit> => {
  const { data, error } = await supabase
    .from('ministry_units')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as MinistryUnit
}

export const deleteMinistryUnit = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('ministry_units')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const getMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_SELECT)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as Member[]).map(normalizeMember)
}

export const getMember = async (id: string): Promise<Member | null> => {
  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return normalizeMember(data as Member)
}

export const createMember = async (member: {
  ministry_unit_id: string
  name: string
  member_role: MemberRole
  photo_url?: string
  photo_position?: PhotoPosition
}): Promise<Member> => {
  const { data, error } = await supabase
    .from('members')
    .insert({
      ...member,
      member_type: getLegacyMemberType(member.member_role),
    })
    .select()
    .single()

  if (error) throw error
  return normalizeMember(data as MemberRecord)
}

const touchMember = async (memberId: string): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', memberId)

  if (error) throw error
}

export const updateMember = async (
  id: string,
  updates: Partial<
    Omit<Member, 'id' | 'created_at' | 'updated_at' | 'ministry_unit' | 'prayer_requests'>
  >
): Promise<Member> => {
  const payload: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }

  if (updates.member_role) {
    payload.member_type = getLegacyMemberType(updates.member_role)
  }

  const { data, error } = await supabase
    .from('members')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return normalizeMember(data as MemberRecord)
}

export const deleteMember = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const getPrayerRequests = async (memberId?: string): Promise<PrayerRequest[]> => {
  let query = supabase
    .from('prayer_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (memberId) {
    query = query.eq('member_id', memberId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as PrayerRequest[]
}

export const createPrayerRequest = async (memberId: string, content: string): Promise<PrayerRequest> => {
  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({ member_id: memberId, content })
    .select()
    .single()

  if (error) throw error
  await touchMember(memberId)
  return data as PrayerRequest
}

export const updatePrayerRequest = async (id: string, content: string): Promise<PrayerRequest> => {
  const { data, error } = await supabase
    .from('prayer_requests')
    .update({ content })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  if (data?.member_id) await touchMember(data.member_id as string)
  return data as PrayerRequest
}

export const deletePrayerRequest = async (id: string): Promise<void> => {
  const { data, error } = await supabase
    .from('prayer_requests')
    .delete()
    .eq('id', id)
    .select('member_id')
    .single()

  if (error) throw error
  if (data?.member_id) await touchMember(data.member_id as string)
}

export const getRecentlyUpdatedMembers = async (): Promise<Member[]> => {
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_SELECT)
    .gte('updated_at', twoWeeksAgo.toISOString())
    .order('updated_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as Member[]).map(normalizeMember)
}
