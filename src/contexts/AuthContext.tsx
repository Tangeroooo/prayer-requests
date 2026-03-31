import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { isAdminAccessEmail, isAllowedAccessEmail } from '@/lib/auth'

interface AuthContextType {
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const applyAccessEmail = (email?: string | null) => {
    const hasAccess = isAllowedAccessEmail(email)

    setIsAuthenticated(hasAccess)
    setIsAdmin(hasAccess && isAdminAccessEmail(email))
  }

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      const { data: sessionData, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Failed to restore auth session:', error)
      }

      if (!sessionData.session) {
        if (!isMounted) return

        applyAccessEmail(null)
        setIsLoading(false)
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error('Failed to validate auth session:', userError)
        await supabase.auth.signOut()
      }

      if (!isMounted) return

      applyAccessEmail(userData.user?.email ?? null)
      setIsLoading(false)
    }

    void initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return

      applyAccessEmail(session?.user?.email ?? null)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    applyAccessEmail(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
