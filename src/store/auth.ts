import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Partner } from '@/types'

interface AuthState {
  user: User | null
  partner: Partner | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  hasHydrated: boolean

  // Actions
  setUser: (user: User | null) => void
  setPartner: (partner: Partner | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  login: (user: User, token: string, partner?: Partner) => void
  logout: () => void
  updatePartner: (partner: Partial<Partner>) => void
  hydrate: () => Promise<void>
}

function clearAuthCookies() {
  if (typeof window === 'undefined') return
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  document.cookie = 'blackbear-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

function setTokenCookie(token: string) {
  if (typeof window === 'undefined') return
  document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      partner: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      hasHydrated: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setPartner: (partner) => set({ partner }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      
      login: (user, token, partner) => {
        set({
          user,
          token,
          partner: partner || null,
          isAuthenticated: true,
          isLoading: false,
          hasHydrated: true,
        })
        // Set token as cookie so API routes can read it
        setTokenCookie(token)
      },
      
      logout: () => {
        set({
          user: null,
          partner: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          hasHydrated: true,
        })
        // Clear all auth cookies
        clearAuthCookies()
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      },
      
      updatePartner: (partnerData) => {
        const currentPartner = get().partner
        if (currentPartner) {
          set({ partner: { ...currentPartner, ...partnerData } })
        }
      },

      /**
       * Verify session with server on app load.
       * Only calls /api/auth/me if no valid token in localStorage,
       * or if the token is expired.
       */
      hydrate: async () => {
        const state = get()
        if (state.hasHydrated) {
          set({ isLoading: false })
          return
        }

        // If we already have a token, trust it initially (fast load)
        if (state.token && state.isAuthenticated && state.user) {
          set({ isLoading: false, hasHydrated: true })
          // Background verify with server (non-blocking)
          fetch('/api/auth/me', {
            headers: state.token ? { 'Authorization': `Bearer ${state.token}` } : undefined,
          })
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json()
                if (data.success && data.user) {
                  set({ user: data.user, partner: data.data?.partner || null, isAuthenticated: true })
                  return
                }
              }
              // Server says invalid — only logout on 401
              if (res.status === 401) {
                get().logout()
              }
              // 500/timeout — don't logout, keep cached session
            })
            .catch(() => {
              // Network error — keep cached session, don't logout
            })
          return
        }

        // No token — check /api/auth/me for existing session
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/me')
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.user) {
              const token = data.data?.token || state.token
              if (token) setTokenCookie(token)
              set({
                user: data.user,
                partner: data.data?.partner || null,
                token: token || null,
                isAuthenticated: true,
                isLoading: false,
                hasHydrated: true,
              })
              return
            }
          }
          // 401 — genuinely not authenticated
          if (res.status === 401) {
            set({ user: null, partner: null, token: null, isAuthenticated: false, isLoading: false, hasHydrated: true })
          } else {
            // Server error — don't logout
            set({ isLoading: false, hasHydrated: true })
          }
        } catch {
          set({ isLoading: false, hasHydrated: true })
        }
      },
    }),
    {
      name: 'blackbear-auth',
      partialize: (state) => ({
        user: state.user,
        partner: state.partner,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // On rehydrate from localStorage, trust cached state
      // hydrate() will background-verify with server
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If we have a valid-looking session, mark hydrated immediately
          // The background verify in hydrate() will fix it if invalid
          if (state.isAuthenticated && state.token && state.user) {
            state.hasHydrated = true
            state.isLoading = false
          } else {
            state.hasHydrated = false
            state.isLoading = true
          }
        }
      },
    }
  )
)

// Helper hook to check if user is owner
export const useIsOwner = () => {
  const user = useAuthStore((state) => state.user)
  return user?.role === 'OWNER'
}

// Helper hook to check if user is partner
export const useIsPartner = () => {
  const user = useAuthStore((state) => state.user)
  return user?.role === 'PARTNER'
}
