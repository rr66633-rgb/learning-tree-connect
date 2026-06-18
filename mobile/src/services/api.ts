import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://api.learningtreeconnect.com/api/v1';

class ApiClient {
  private token: string | null = null;

  async init() {
    this.token = await AsyncStorage.getItem('accessToken');
  }

  setToken(token: string) {
    this.token = token;
    AsyncStorage.setItem('accessToken', token);
  }

  clearToken() {
    this.token = null;
    AsyncStorage.removeItem('accessToken');
  }

  private async request(method: string, path: string, body?: any) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Request failed'); }
    return res.json();
  }

  get(path: string) { return this.request('GET', path); }
  post(path: string, body?: any) { return this.request('POST', path, body); }
  put(path: string, body?: any) { return this.request('PUT', path, body); }
  patch(path: string, body?: any) { return this.request('PATCH', path, body); }
  delete(path: string) { return this.request('DELETE', path); }
}

export const api = new ApiClient();

export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
};

export const childrenService = {
  getAll: () => api.get('/children'),
  getById: (id: string) => api.get(`/children/${id}`),
  create: (data: any) => api.post('/children', data),
};

export const attendanceService = {
  getByDate: (date: string) => api.get(`/attendance?date=${date}`),
  checkIn: (childId: string) => api.post('/attendance/check-in', { childId }),
  checkOut: (childId: string) => api.post('/attendance/check-out', { childId }),
};

export const dailyReportsService = {
  getAll: () => api.get('/daily-reports'),
  getByChild: (childId: string) => api.get(`/daily-reports?childId=${childId}`),
  create: (data: any) => api.post('/daily-reports', data),
  publish: (id: string) => api.patch(`/daily-reports/${id}/publish`),
};

export const messagingService = {
  getConversations: () => api.get('/communication/conversations'),
  getMessages: (userId: string) => api.get(`/communication/messages/${userId}`),
  sendMessage: (data: any) => api.post('/communication/messages', data),
};

export const notificationsService = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const loyaltyService = {
  getBalance: () => api.get('/loyalty/balance'),
  getRewards: () => api.get('/loyalty/rewards'),
  getTransactions: () => api.get('/loyalty/transactions'),
  redeem: (rewardId: string) => api.post('/loyalty/redeem', { rewardId }),
};
