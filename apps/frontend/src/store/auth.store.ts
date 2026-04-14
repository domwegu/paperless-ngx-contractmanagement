import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          set({ user: data.user, accessToken: data.accessToken, isLoading: false });
        } catch {
          set({ isLoading: false });
          throw new Error('E-Mail oder Passwort falsch');
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null });
      },

      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    { name: 'vv-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken }) },
  ),
);
