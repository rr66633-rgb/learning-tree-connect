import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (tenantId) config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('tenantId');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

export const childrenApi = {
  getAll: (params?: any) => api.get('/children', { params }),
  getOne: (id: string) => api.get(`/children/${id}`),
  create: (data: any) => api.post('/children', data),
  update: (id: string, data: any) => api.put(`/children/${id}`, data),
};

export const attendanceApi = {
  getByDate: (date: string, classId?: string) => api.get('/attendance', { params: { date, classId } }),
  checkIn: (childId: string) => api.post('/attendance/check-in', { childId }),
  checkOut: (childId: string) => api.post('/attendance/check-out', { childId }),
  bulkMark: (date: string, records: any[]) => api.post('/attendance/bulk', { date, records }),
  getDailyReport: (date: string) => api.get('/attendance/report', { params: { date } }),
};

export const dailyReportsApi = {
  getAll: (params?: any) => api.get('/daily-reports', { params }),
  getOne: (id: string) => api.get(`/daily-reports/${id}`),
  create: (data: any) => api.post('/daily-reports', data),
  update: (id: string, data: any) => api.put(`/daily-reports/${id}`, data),
  publish: (id: string) => api.patch(`/daily-reports/${id}/publish`),
  getChildReports: (childId: string) => api.get(`/daily-reports/child/${childId}`),
};

export const communicationApi = {
  getConversations: () => api.get('/communication/conversations'),
  getMessages: (partnerId: string) => api.get(`/communication/messages/${partnerId}`),
  sendMessage: (data: any) => api.post('/communication/messages', data),
  getAnnouncements: () => api.get('/communication/announcements'),
  createAnnouncement: (data: any) => api.post('/communication/announcements', data),
  getEvents: () => api.get('/communication/events'),
};

export const notificationsApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export const financeApi = {
  getInvoices: (params?: any) => api.get('/finance/invoices', { params }),
  getInvoice: (id: string) => api.get(`/finance/invoices/${id}`),
  createInvoice: (data: any) => api.post('/finance/invoices', data),
  recordPayment: (data: any) => api.post('/finance/payments', data),
  getFeeStructures: () => api.get('/finance/fee-structures'),
  getFinancialSummary: () => api.get('/finance/summary'),
};

export const loyaltyApi = {
  getProgram: () => api.get('/loyalty/program'),
  getRewards: () => api.get('/loyalty/rewards'),
  getBalance: () => api.get('/loyalty/balance'),
  getTransactions: () => api.get('/loyalty/transactions'),
  redeemReward: (rewardId: string) => api.post('/loyalty/redeem', { rewardId }),
};

export const hrApi = {
  getStaff: () => api.get('/hr/staff'),
  getLeaveRequests: () => api.get('/hr/leave-requests'),
  createLeaveRequest: (data: any) => api.post('/hr/leave-requests', data),
};

export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getEnrollment: () => api.get('/analytics/enrollment'),
  getAttendance: () => api.get('/analytics/attendance'),
  getRevenue: () => api.get('/analytics/revenue'),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
};

export default api;
