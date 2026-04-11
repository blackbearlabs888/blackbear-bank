import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Partner } from '@/types'

interface AuthState {
  user: User | null
  partner: Partner | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setPartner: (partner: Partner | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  login: (user: User, token: string, partner?: Partner) => void
  logout: () => void
  updatePartner: (partner: Partial<Partner>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      partner: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setPartner: (partner) => set({ partner }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      
      login: (user, token, partner) => set({
        user,
        token,
        partner: partner || null,
        isAuthenticated: true,
        isLoading: false
      }),
      
      logout: () => set({
        user: null,
        partner: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      }),
      
      updatePartner: (partnerData) => {
        const currentPartner = get().partner
        if (currentPartner) {
          set({ partner: { ...currentPartner, ...partnerData } })
        }
      }
    }),
    {
      name: 'blackbear-auth',
      partialize: (state) => ({
        user: state.user,
        partner: state.partner,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
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
