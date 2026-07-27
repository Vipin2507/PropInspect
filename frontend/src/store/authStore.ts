import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { authApi } from '../utils/api'
import { dashboardForRole } from '../constants/routes'

interface AuthStore {
  user: User | null
  token: string | null
  otpMobile: string | null
  setAuth: (user: User, token: string) => void
  setUser: (user: User) => void
  logout: () => void
  setOtpMobile: (mobile: string | null) => void
  login: (email: string, password: string) => Promise<string>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      otpMobile: null,
      setAuth: (user, token) => {
        localStorage.setItem('snagdesk_token', token)
        localStorage.removeItem('snagdesk_last_prefetch')
        set({ user, token })
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem('snagdesk_token')
        localStorage.removeItem('snagdesk_last_prefetch')
        set({ user: null, token: null })
      },
      setOtpMobile: (mobile) => set({ otpMobile: mobile }),
      login: async (email, password) => {
        const { data } = await authApi.login(email.trim().toLowerCase(), password.trim())
        get().setAuth(data.user, data.token)
        return dashboardForRole(data.user.role)
      },
      fetchMe: async () => {
        const { data } = await authApi.me()
        set({ user: data.user })
      },
    }),
    { name: 'snagdesk-auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)
