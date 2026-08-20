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

        // Guest-safe optimization (Homepage Mobile Performance correction):
        // The persisted `isAuthenticated` flag from localStorage is our only
        // client-side session hint (the `sessionId` cookie is httpOnly, so
        // `document.cookie` cannot be sniffed). On PUBLIC routes, if the last
        // known state was "not authenticated", skip the `/api/auth/me` round-
        // trip entirely — it would only return 401 and pollute the guest console.
        //
        // ROUTE-AWARE GUARD (Scenario C correction):
        //   On PROTECTED APPLICATION routes only (/owner, /partner, /dashboard),
        //   NEVER skip the server verification — even if localStorage is stale/
        //   empty, a valid httpOnly `sessionId` cookie may still exist. Skipping
        //   here would cause the dashboard to see `isAuthenticated: false` and
        //   redirect a validly-logged-in user to /login.
        //
        //   /login and /register are PUBLIC auth pages, NOT protected routes.
        //   A logged-out visitor on those pages must NOT trigger /api/auth/me
        //   (which would 401 and pollute the console). Authenticated-user
        //   redirect away from /login /register is handled by existing
        //   middleware/server logic + the login/register client components
        //   themselves — NOT by this hydrate() skip.
        //
        // Security is NOT weakened:
        //   - Authenticated users (persisted `isAuthenticated: true`) STILL
        //     hit the server for verification on every load.
        //   - Protected application routes ALWAYS verify with the server.
        //   - The `/api/auth/me` endpoint contract is unchanged (still 401
        //     for unauthenticated callers).
        const PROTECTED_PREFIXES = ['/owner', '/partner', '/dashboard'];
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        const isProtectedRoute = PROTECTED_PREFIXES.some(
          (prefix) => currentPath === prefix || currentPath.startsWith(prefix + '/') || currentPath.startsWith(prefix)
        );

        if (!isProtectedRoute && !state.isAuthenticated && !state.user) {
          set({
            user: null,
            partner: null,
            isAuthenticated: false,
            isLoading: false,
            hasHydrated: true,
          });
          return;
        }

        // Verify with server (authenticated hint present OR protected route)
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
