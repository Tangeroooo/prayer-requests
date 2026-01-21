import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isAdmin: boolean
  login: () => void
  logout: () => void
  setAdminMode: (isAdmin: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_KEY = 'prayer_auth'
const ADMIN_KEY = 'prayer_admin'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(AUTH_KEY) === 'true'
  })
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem(ADMIN_KEY) === 'true'
  })

  useEffect(() => {
    sessionStorage.setItem(AUTH_KEY, String(isAuthenticated))
  }, [isAuthenticated])

  useEffect(() => {
    sessionStorage.setItem(ADMIN_KEY, String(isAdmin))
  }, [isAdmin])

  const login = () => setIsAuthenticated(true)
  const logout = () => {
    setIsAuthenticated(false)
    setIsAdmin(false)
  }
  const setAdminMode = (admin: boolean) => setIsAdmin(admin)

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, login, logout, setAdminMode }}>
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
