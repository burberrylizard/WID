// ═══════════════════════════════════════════════════════════
// WIDS API Service — Live API client
// Communicates with Python Flask backend at /api
// ═══════════════════════════════════════════════════════════

import axios from 'axios';

// Get base URL from environment or fallback
let baseUrl = import.meta.env.VITE_API_URL || '/api';
if (baseUrl.startsWith('http') && !baseUrl.includes('/api')) {
  baseUrl = baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
}

const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Bypasses ngrok's intermediate warning page
  },
});

// Request interceptor to attach authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wids-token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    const userStr = localStorage.getItem('wids-user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj && userObj.username) {
          config.headers['X-User-Username'] = userObj.username;
        }
      } catch (err) {}
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors uniformly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'API request failed';
    return Promise.reject(new Error(message));
  }
);

// ══════════════════════════════════════════════════════════
// Dashboard API
// ══════════════════════════════════════════════════════════
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChartData: () => api.get('/dashboard/charts'),
};

// ══════════════════════════════════════════════════════════
// Scanner API
// ══════════════════════════════════════════════════════════
export const scannerAPI = {
  getDetectedAPs: () => api.get('/scanner/detected'),
  triggerScan: () => api.post('/scanner/trigger'),
  getScanHistory: () => api.get('/scanner/history'),
  getStatus: () => api.get('/scanner/status'),
};

// ══════════════════════════════════════════════════════════
// Whitelist API
// ══════════════════════════════════════════════════════════
export const whitelistAPI = {
  getAll: () => api.get('/whitelist/'),
  add: (ap) => api.post('/whitelist/', {
    ssid: ap.ssid,
    bssid: ap.bssid,
    channel: parseInt(ap.channel) || 0,
  }),
  update: (id, data) => api.put(`/whitelist/${id}`, {
    ssid: data.ssid,
    bssid: data.bssid,
    channel: parseInt(data.channel) || 0,
  }),
  remove: (id) => api.delete(`/whitelist/${id}`),
};

// ══════════════════════════════════════════════════════════
// Alerts API
// ══════════════════════════════════════════════════════════
export const alertsAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.severity) params.append('severity', filters.severity.toLowerCase());
    if (filters.type) params.append('type', filters.type);
    if (filters.is_read !== undefined) params.append('is_read', filters.is_read.toString());
    
    return api.get(`/alerts/?${params.toString()}`);
  },
  getRecent: (limit = 5) => api.get(`/alerts/recent?limit=${limit}`),
  markAsRead: (id) => api.put(`/alerts/${id}/read`),
  markAllAsRead: () => api.put('/alerts/mark-all-read'),
};

// ══════════════════════════════════════════════════════════
// Auth API
// ══════════════════════════════════════════════════════════
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: (userId) => api.post('/auth/logout', { user_id: userId }),
  getProfile: () => api.get('/auth/profile'),
};

// ══════════════════════════════════════════════════════════
// Users API
// ══════════════════════════════════════════════════════════
export const usersAPI = {
  getAll: () => api.get('/users/'),
  add: (userData) => api.post('/users/', {
    fullName: userData.fullName,
    username: userData.username,
    email: userData.email,
    role: userData.role,
    password: userData.password,
  }),
  update: (id, data) => api.put(`/users/${id}`, {
    fullName: data.fullName,
    email: data.email,
    role: data.role,
  }),
  remove: (id) => api.delete(`/users/${id}`),
};

// ══════════════════════════════════════════════════════════
// Audit API
// ══════════════════════════════════════════════════════════
export const auditAPI = {
  getLogs: (page = 1, limit = 10, filters = {}) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (filters.username) params.append('username', filters.username);
    if (filters.action) params.append('action', filters.action);
    return api.get(`/audit/?${params.toString()}`);
  },
};
