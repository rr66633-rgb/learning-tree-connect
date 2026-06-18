import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, authService } from '../services/api';

interface AuthState {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  language: 'ar' | 'en';
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setLanguage: (lang: 'ar' | 'en') => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  language: 'ar',
  loading: true,
  login: async (email: string, password: string) => {
    const res = await authService.login(email, password);
    api.setToken(res.accessToken);
    set({ user: res.user, token: res.accessToken, isAuthenticated: true });
  },
  logout: () => {
    api.clearToken();
    set({ user: null, token: null, isAuthenticated: false });
  },
  setLanguage: (lang) => {
    AsyncStorage.setItem('language', lang);
    set({ language: lang });
  },
  checkAuth: async () => {
    try {
      await api.init();
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const user = await authService.getProfile();
        set({ user, token, isAuthenticated: true, loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false, isAuthenticated: false });
    }
  },
}));
