import { create } from 'zustand'
import { queryClient } from '../api/queryClient'
import type { TaxpayerCategory } from '../types'

export interface AuthUser {
  id: number
  email: string
  fullName: string
  role: string
  tin: string
  country: string
  taxpayerCategory: TaxpayerCategory
}

interface PractitionerSession {
  token: string
  user: AuthUser
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  practitionerSession: PractitionerSession | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  updateUser: (user: AuthUser) => void
  impersonate: (clientToken: string, clientUser: AuthUser) => void
  exitImpersonation: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('auth_token'),
  user: (() => {
    try {
      const stored = localStorage.getItem('auth_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })(),
  isAuthenticated: !!localStorage.getItem('auth_token'),
  practitionerSession: (() => {
    try {
      const stored = localStorage.getItem('auth_practitioner_session')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })(),

  login: (token, user) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_practitioner_session')
    // Drop all cached query data so the next user who signs in never sees the
    // previous user's transactions, returns, billing status, etc.
    queryClient.clear()
    set({ token: null, user: null, isAuthenticated: false, practitionerSession: null })
  },

  updateUser: (user) => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ user })
  },

  impersonate: (clientToken, clientUser) => {
    const { token, user } = get()
    if (!token || !user) return
    const session: PractitionerSession = { token, user }
    localStorage.setItem('auth_practitioner_session', JSON.stringify(session))
    localStorage.setItem('auth_token', clientToken)
    localStorage.setItem('auth_user', JSON.stringify(clientUser))
    // Switching into a client account: clear the practitioner's cached data.
    queryClient.clear()
    set({ token: clientToken, user: clientUser, practitionerSession: session })
  },

  exitImpersonation: () => {
    const { practitionerSession } = get()
    if (!practitionerSession) return
    localStorage.setItem('auth_token', practitionerSession.token)
    localStorage.setItem('auth_user', JSON.stringify(practitionerSession.user))
    localStorage.removeItem('auth_practitioner_session')
    // Switching back to the practitioner account: clear the client's cached data.
    queryClient.clear()
    set({
      token: practitionerSession.token,
      user: practitionerSession.user,
      practitionerSession: null,
    })
  },
}))
