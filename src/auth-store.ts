import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Partner } from '@/types';

interface AuthState {
  user: User | null;
  partner: Partner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setPartner: (partner: Partner | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      partner: null,
      isAuthenticated: false,
      isLoading: true,
      hasHydrated: false,

      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        isLoading: false,
        hasHydrated: true,
      }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      setPartner: (partner) => set({ partner }),

      setLoading: (isLoading) => set({ isLoading }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({ 
          user: null, 
          partner: null, 
          isAuthenticated: false,
          isLoading: false,
          hasHydrated: true,
        });
        // Redirect to login page after logout
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      // Clear auth state when API returns 401
      clearAuth: () => {
        set({ 
          user: null, 
          partner: null, 
          isAuthenticated: false,
        });
      },

      hydrate: async () => {
        const state = get();
        
        // Don't re-hydrate if already done
        if (state.hasHydrated) {
          set({ isLoading: false });
          return;
        }

        // Always verify with server
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              set({ 
                user: data.user, 
                partner: data.partner || null,
                isAuthenticated: true,
                isLoading: false,
                hasHydrated: true,
              });
              return;
            }
          }
          // No valid session - clear everything
          set({ 
            user: null, 
            partner: null, 
            isAuthenticated: false,
            isLoading: false,
            hasHydrated: true,
          });
        } catch (error) {
          console.error('Hydration error:', error);
          set({ 
            isLoading: false,
            hasHydrated: true,
          });
        }
      },
    }),
    {
      name: 'blackbear-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        partner: state.partner,
        isAuthenticated: state.isAuthenticated,
      }),
      // Always start with hasHydrated = false so hydrate() is called
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Don't trust localStorage - always verify with server
          state.hasHydrated = false;
          state.isLoading = true;
        }
      },
    }
  )
);
