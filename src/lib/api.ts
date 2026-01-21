import { supabase } from './supabase'
import type { SmallGroup, Member, PrayerRequest } from '@/types'

// Settings - 환경 변수에서 비밀번호 확인
export const verifySitePassword = (password: string): boolean => {
  const envPassword = import.meta.env.VITE_SITE_PASSWORD
  return password === envPassword
}

export const verifyAdminPassword = (password: string): boolean => {
  const envPassword = import.meta.env.VITE_ADMIN_PASSWORD
  return password === envPassword
}

// Small Groups
export const getSmallGroups = async (): Promise<SmallGroup[]> => {
  const { data, error } = await supabase
    .from('small_groups')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export const createSmallGroup = async (name: string): Promise<SmallGroup> => {
  const { data, error } = await supabase
    .from('small_groups')
    .insert({ name })
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateSmallGroup = async (id: string, name: string): Promise<SmallGroup> => {
  const { data, error } = await supabase
    .from('small_groups')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteSmallGroup = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('small_groups')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Members
export const getMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      small_group:small_groups(*),
      prayer_requests(*)
    `)
    .order('updated_at', { ascending: false })

  if (error) throw error

  // 기도제목을 생성순으로 정렬 (먼저 넣은 것이 1번)
  return (data || []).map(member => ({
    ...member,
    prayer_requests: member.prayer_requests?.sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }))
}

export const getMember = async (id: string): Promise<Member | null> => {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      small_group:small_groups(*),
      prayer_requests(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  // 기도제목을 생성순으로 정렬 (먼저 넣은 것이 1번)
  if (data?.prayer_requests) {
    data.prayer_requests.sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  return data
}

export const createMember = async (member: {
  small_group_id: string
  name: string
  role: 'leader' | 'sub_leader'
  photo_url?: string
  photo_position?: { x: number; y: number }
}): Promise<Member> => {
  const { data, error } = await supabase
    .from('members')
    .insert(member)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateMember = async (
  id: string,
  updates: Partial<Omit<Member, 'id' | 'created_at' | 'updated_at'>>
): Promise<Member> => {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteMember = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Prayer Requests
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
  return data || []
}

export const createPrayerRequest = async (memberId: string, content: string): Promise<PrayerRequest> => {
  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({ member_id: memberId, content })
    .select()
    .single()

  if (error) throw error
  return data
}

export const updatePrayerRequest = async (id: string, content: string): Promise<PrayerRequest> => {
  const { data, error } = await supabase
    .from('prayer_requests')
    .update({ content })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deletePrayerRequest = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('prayer_requests')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// 최근 2주 업데이트된 멤버 가져오기
export const getRecentlyUpdatedMembers = async (): Promise<Member[]> => {
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      small_group:small_groups(*),
      prayer_requests(*)
    `)
    .gte('updated_at', twoWeeksAgo.toISOString())
    .order('updated_at', { ascending: false })

  if (error) throw error

  // 기도제목을 생성순으로 정렬 (먼저 넣은 것이 1번)
  return (data || []).map(member => ({
    ...member,
    prayer_requests: member.prayer_requests?.sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }))
}
