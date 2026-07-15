import { create } from 'zustand';
import { api, tokenStore, unwrap } from './api';
import type { AuthResponse, User } from './types';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    username: string;
    displayName: string;
    asBusiness?: boolean;
  }) => Promise<void>;
  loadSession: () => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',

  async login(email, password) {
    set({ status: 'loading' });
    const data = await unwrap<AuthResponse>(api.post('/auth/login', { email, password }));
    tokenStore.set(data.accessToken, data.refreshToken);
    set({ user: data.user, status: 'authenticated' });
  },

  async register(input) {
    set({ status: 'loading' });
    const data = await unwrap<AuthResponse>(api.post('/auth/register', input));
    tokenStore.set(data.accessToken, data.refreshToken);
    set({ user: data.user, status: 'authenticated' });
  },

  async setTokens(access, refresh) {
    tokenStore.set(access, refresh);
    await get().loadSession();
  },

  async loadSession() {
    if (!tokenStore.access) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    set({ status: 'loading' });
    try {
      const user = await unwrap<User>(api.get('/auth/me'));
      set({ user, status: 'authenticated' });
    } catch {
      tokenStore.clear();
      set({ status: 'unauthenticated', user: null });
    }
  },

  async logout() {
    try {
      if (tokenStore.refresh) {
        await api.post('/auth/logout', { refreshToken: tokenStore.refresh });
      }
    } catch {
      // ignore
    }
    tokenStore.clear();
    set({ user: null, status: 'unauthenticated' });
  },
}));
