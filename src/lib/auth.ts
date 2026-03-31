import { supabase } from './supabase'

const DEFAULT_SITE_ACCESS_EMAIL = 'site-access@prayer.local'
const DEFAULT_ADMIN_ACCESS_EMAIL = 'admin-access@prayer.local'

export const SITE_ACCESS_EMAIL =
  import.meta.env.VITE_SITE_ACCESS_EMAIL || DEFAULT_SITE_ACCESS_EMAIL

export const ADMIN_ACCESS_EMAIL =
  import.meta.env.VITE_ADMIN_ACCESS_EMAIL || DEFAULT_ADMIN_ACCESS_EMAIL

export type SharedAccessScope = 'site' | 'admin'

export const isAdminAccessEmail = (email?: string | null): boolean => {
  return email === ADMIN_ACCESS_EMAIL
}

export const isAllowedAccessEmail = (email?: string | null): boolean => {
  return email === SITE_ACCESS_EMAIL || email === ADMIN_ACCESS_EMAIL
}

const getEmailForScope = (scope: SharedAccessScope) => {
  return scope === 'admin' ? ADMIN_ACCESS_EMAIL : SITE_ACCESS_EMAIL
}

export const signInWithSharedPassword = async (
  scope: SharedAccessScope,
  password: string
) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: getEmailForScope(scope),
    password,
  })

  if (error) throw error

  const email = data.user?.email ?? data.session?.user.email ?? null

  if (!isAllowedAccessEmail(email)) {
    await supabase.auth.signOut()
    throw new Error('허용되지 않은 계정입니다.')
  }

  return data
}

export const getSharedAuthErrorMessage = (
  error: unknown,
  fallbackMessage: string
) => {
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase()

    if (
      normalized.includes('invalid login credentials') ||
      normalized.includes('email not confirmed') ||
      normalized.includes('invalid_credentials')
    ) {
      return fallbackMessage
    }

    return error.message
  }

  return fallbackMessage
}
