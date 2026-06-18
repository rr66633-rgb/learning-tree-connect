import { create } from 'zustand';

interface Tenant {
  tenantId: string;
  tenantName: string;
  tenantNameAr: string;
  role: string;
  subdomain: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  avatarUrl?: string;
  language: string;
  tenants: Tenant[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  tenantId: string | null;
  currentTenant: Tenant | null;
  language: 'ar' | 'en';
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setTenant: (tenantId: string) => void;
  setLanguage: (lang: 'ar' | 'en') => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  tenantId: null,
  currentTenant: null,
  language: 'ar',
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    const tenantId = user.tenants?.[0]?.tenantId || null;
    if (tenantId) localStorage.setItem('tenantId', tenantId);
    set({
      user, token, tenantId,
      currentTenant: user.tenants?.[0] || null,
      language: (user.language as 'ar' | 'en') || 'ar',
      isAuthenticated: true,
    });
  },

  setTenant: (tenantId) => {
    localStorage.setItem('tenantId', tenantId);
    const user = get().user;
    const tenant = user?.tenants?.find(t => t.tenantId === tenantId) || null;
    set({ tenantId, currentTenant: tenant });
  },

  setLanguage: (lang) => {
    localStorage.setItem('language', lang);
    set({ language: lang });
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    set({ user: null, token: null, tenantId: null, currentTenant: null, isAuthenticated: false });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    const tenantId = localStorage.getItem('tenantId');
    const lang = (localStorage.getItem('language') as 'ar' | 'en') || 'ar';
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const tenant = user.tenants?.find((t: Tenant) => t.tenantId === tenantId) || user.tenants?.[0];
        set({ user, token, tenantId: tenantId || tenant?.tenantId, currentTenant: tenant, language: lang, isAuthenticated: true });
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      } catch { set({ isAuthenticated: false }); }
    }
  },
}));
