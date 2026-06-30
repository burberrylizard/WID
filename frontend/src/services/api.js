// ═══════════════════════════════════════════════════════════
// WIDS API Service — Mock API layer
// Simulates backend calls using mock data
// Replace with real axios calls when backend is ready
// ═══════════════════════════════════════════════════════════

import {
  mockWhitelist,
  mockDetectedAPs,
  mockAlerts,
  mockDashboardStats,
  mockAlertsByHour,
  mockAPTypeDistribution,
  mockAlertsByType,
  mockSignalHistory,
  mockScanHistory,
  mockUsers,
} from '../data/mockData';

// Simulate network delay
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Deep clone helper ──────────────────────────────────
const clone = (data) => JSON.parse(JSON.stringify(data));

// ── In-memory state (mutable copies) ───────────────────
let whitelist = clone(mockWhitelist);
let alerts = clone(mockAlerts);
let detectedAPs = clone(mockDetectedAPs);
let users = clone(mockUsers);
let nextWhitelistId = whitelist.length + 1;
let nextUserId = users.length + 1;

// ══════════════════════════════════════════════════════════
// Dashboard API
// ══════════════════════════════════════════════════════════
export const dashboardAPI = {
  getStats: async () => {
    await delay(200);
    const unreadCount = alerts.filter((a) => !a.is_read).length;
    const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.is_read).length;
    return {
      ...mockDashboardStats,
      total_aps: detectedAPs.length,
      trusted_aps: detectedAPs.filter((ap) => ap.status === 'trusted').length,
      rogue_aps: detectedAPs.filter((ap) => ap.status === 'rogue').length,
      evil_twins: detectedAPs.filter((ap) => ap.status === 'evil_twin').length,
      unknown_aps: detectedAPs.filter((ap) => ap.status === 'unknown').length,
      total_alerts: alerts.length,
      unread_alerts: unreadCount,
      critical_alerts: criticalCount,
    };
  },

  getChartData: async () => {
    await delay(150);
    return {
      alertsByHour: clone(mockAlertsByHour),
      apTypeDistribution: clone(mockAPTypeDistribution),
      alertsByType: clone(mockAlertsByType),
      signalHistory: clone(mockSignalHistory),
    };
  },
};

// ══════════════════════════════════════════════════════════
// Scanner API
// ══════════════════════════════════════════════════════════
export const scannerAPI = {
  getDetectedAPs: async () => {
    await delay(250);
    return clone(detectedAPs);
  },

  triggerScan: async () => {
    await delay(1500); // Simulate scan time
    // Slightly randomize signal strengths
    detectedAPs = detectedAPs.map((ap) => ({
      ...ap,
      signal: ap.signal + Math.floor(Math.random() * 6) - 3,
      scanned_at: new Date().toISOString(),
    }));
    return { success: true, aps_found: detectedAPs.length, scan_method: 'netsh' };
  },

  getScanHistory: async () => {
    await delay(200);
    return clone(mockScanHistory);
  },

  getStatus: async () => {
    await delay(100);
    return {
      status: 'active',
      method: 'netsh',
      last_scan: new Date().toISOString(),
      interval: 30,
    };
  },
};

// ══════════════════════════════════════════════════════════
// Whitelist API
// ══════════════════════════════════════════════════════════
export const whitelistAPI = {
  getAll: async () => {
    await delay(200);
    return clone(whitelist);
  },

  add: async (ap) => {
    await delay(300);
    const newAP = {
      id: nextWhitelistId++,
      ssid: ap.ssid,
      bssid: ap.bssid.toUpperCase(),
      channel: parseInt(ap.channel) || 0,
      added_by: 'admin',
      created_at: new Date().toISOString(),
    };
    whitelist.push(newAP);

    // Update any detected AP with matching BSSID to trusted
    detectedAPs = detectedAPs.map((det) =>
      det.bssid === newAP.bssid ? { ...det, status: 'trusted' } : det
    );

    return clone(newAP);
  },

  update: async (id, data) => {
    await delay(300);
    const index = whitelist.findIndex((ap) => ap.id === id);
    if (index === -1) throw new Error('AP not found');
    whitelist[index] = { ...whitelist[index], ...data };
    return clone(whitelist[index]);
  },

  remove: async (id) => {
    await delay(300);
    const ap = whitelist.find((a) => a.id === id);
    whitelist = whitelist.filter((a) => a.id !== id);

    // If removed from whitelist, re-classify detected APs
    if (ap) {
      detectedAPs = detectedAPs.map((det) => {
        if (det.bssid === ap.bssid) {
          // Check if SSID matches another whitelist entry (could be evil twin)
          const sameSSID = whitelist.some((w) => w.ssid === det.ssid);
          return { ...det, status: sameSSID ? 'evil_twin' : 'rogue' };
        }
        return det;
      });
    }

    return { success: true };
  },
};

// ══════════════════════════════════════════════════════════
// Alerts API
// ══════════════════════════════════════════════════════════
export const alertsAPI = {
  getAll: async (filters = {}) => {
    await delay(200);
    let filtered = clone(alerts);

    if (filters.severity) {
      filtered = filtered.filter((a) => a.severity === filters.severity);
    }
    if (filters.type) {
      filtered = filtered.filter((a) => a.alert_type === filters.type);
    }
    if (filters.is_read !== undefined) {
      filtered = filtered.filter((a) => a.is_read === filters.is_read);
    }

    // Sort by created_at descending
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return filtered;
  },

  getRecent: async (limit = 5) => {
    await delay(150);
    const sorted = clone(alerts).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return sorted.slice(0, limit);
  },

  markAsRead: async (id) => {
    await delay(200);
    const alert = alerts.find((a) => a.id === id);
    if (alert) alert.is_read = true;
    return { success: true };
  },

  markAllAsRead: async () => {
    await delay(300);
    alerts.forEach((a) => (a.is_read = true));
    return { success: true };
  },
};

// ══════════════════════════════════════════════════════════
// Auth API
// ══════════════════════════════════════════════════════════
export const authAPI = {
  login: async (username, password) => {
    await delay(500);
    const foundUserIndex = users.findIndex(u => u.username === username);
    if (foundUserIndex !== -1) {
      const foundUser = users[foundUserIndex];
      if (password === username || password === 'password' || password === 'admin') {
        // Update last login and active status
        users[foundUserIndex] = {
          ...foundUser,
          isActive: true,
          lastLogin: new Date().toISOString()
        };
        return {
          success: true,
          user: users[foundUserIndex],
          token: 'mock-jwt-token-' + Date.now(),
        };
      }
    }
    throw new Error('Invalid username or password');
  },

  logout: async () => {
    await delay(200);
    return { success: true };
  },

  getProfile: async () => {
    await delay(200);
    return {
      id: 1,
      username: 'admin',
      email: 'admin@wids.local',
      role: 'admin',
    };
  },
};

// ══════════════════════════════════════════════════════════
// Users API
// ══════════════════════════════════════════════════════════
export const usersAPI = {
  getAll: async () => {
    await delay(200);
    return clone(users);
  },

  add: async (userData) => {
    await delay(300);
    if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
      throw new Error('Username already exists');
    }
    const currentId = nextUserId++;
    const newUser = {
      id: currentId,
      userId: `U-${String(currentId).padStart(3, '0')}`,
      fullName: userData.fullName || 'New Operator',
      username: userData.username,
      email: userData.email,
      role: userData.role || 'viewer',
      isActive: false,
      lastLogin: 'Never',
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    return clone(newUser);
  },

  update: async (id, data) => {
    await delay(300);
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    users[index] = { ...users[index], ...data };
    return clone(users[index]);
  },

  remove: async (id) => {
    await delay(300);
    if (id === 1) throw new Error('Cannot delete primary administrator account');
    users = users.filter((u) => u.id !== id);
    return { success: true };
  },
};
