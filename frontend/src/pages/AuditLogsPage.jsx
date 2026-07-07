// ==============================================================================
// **AUDIT LOGS AUDITING**
// ==============================================================================

import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { auditAPI } from '../services/api';
import { 
  HiOutlineChevronLeft, 
  HiOutlineChevronRight, 
  HiOutlineDocumentText,
  HiOutlineUser,
  HiOutlineFunnel,
  HiOutlineArrowPath
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import './AuditLogsPage.css';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filters
  const [usernameFilter, setUsernameFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async (page = 1, isManualRefresh = false) => {
    setLoading(true);
    const toastId = isManualRefresh ? toast.loading('Refreshing audit trail...') : null;
    try {
      const filters = {
        username: usernameFilter,
        action: actionFilter
      };
      const res = await auditAPI.getLogs(page, itemsPerPage, filters);
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.pages);
      setCurrentPage(res.current_page);
      if (toastId) toast.success('Audit trail updated.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve audit trail.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [usernameFilter, actionFilter]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchLogs(page);
    }
  };

  const getActionBadgeClass = (action) => {
    if (action.includes('FAIL') || action.includes('DELETE')) {
      return 'badge-danger';
    }
    if (action.includes('ADD') || action.includes('CREATE') || action.includes('LOGIN')) {
      return 'badge-trusted';
    }
    if (action.includes('UPDATE')) {
      return 'badge-warning';
    }
    if (action.includes('SCAN')) {
      return 'badge-purple';
    }
    return 'badge-info';
  };

  const formatActionName = (action) => {
    return action.replace('_', ' ');
  };

  return (
    <Layout title="System Audit Logs">
      {/* Top Filter Panel */}
      <div className="glass-card audit-filter-card">
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div className="flex items-center gap-2">
            <HiOutlineFunnel style={{ color: 'var(--neon-cyan)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Filter Activity Logs</h3>
          </div>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => fetchLogs(currentPage, true)}
            disabled={loading}
          >
            <HiOutlineArrowPath className={loading ? 'animate-spin' : ''} />
            Sync Logs
          </button>
        </div>

        <div className="audit-filter-grid">
          <div className="form-group">
            <label className="form-label">Operator / User</label>
            <div style={{ position: 'relative' }}>
              <HiOutlineUser className="input-icon" />
              <input 
                type="text" 
                className="input" 
                placeholder="Search by operator..." 
                value={usernameFilter}
                onChange={(e) => setUsernameFilter(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Action / Event Type</label>
            <select 
              className="input" 
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="USER_LOGIN">User Login</option>
              <option value="USER_LOGIN_FAIL">Failed Login Attempt</option>
              <option value="USER_LOGOUT">User Logout</option>
              <option value="WHITELIST_ADD">Whitelist AP Added</option>
              <option value="WHITELIST_UPDATE">Whitelist AP Updated</option>
              <option value="WHITELIST_DELETE">Whitelist AP Deleted</option>
              <option value="USER_CREATE">Operator Account Created</option>
              <option value="USER_UPDATE">Operator Account Updated</option>
              <option value="USER_DELETE">Operator Account Deleted</option>
              <option value="MANUAL_SCAN_TRIGGER">Manual RF Scan Sweep</option>
              <option value="ALERT_ACK">Alert Acknowledged</option>
              <option value="ALERT_ACK_ALL">All Alerts Acknowledged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Audit Logs Table */}
      <div className="glass-card audit-logs-card" style={{ marginTop: '24px' }}>
        {loading ? (
          <div className="flex justify-center items-center w-full" style={{ height: '300px' }}>
            <div className="loading-spinner" />
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 0' }}>
            <HiOutlineDocumentText className="empty-state-icon" />
            <h4 className="empty-state-title">No Audit Logs Found</h4>
            <p>No activity logs match your filter criteria.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Operator</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Client IP</th>
                    <th>Activity Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="mono-text" style={{ color: 'var(--neon-cyan)', fontWeight: '600' }}>
                          {log.username}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getActionBadgeClass(log.action)}`}>
                          {formatActionName(log.action)}
                        </span>
                      </td>
                      <td>
                        <span className="mono-text" style={{ fontSize: '0.85rem' }}>
                          {log.target}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {log.ipAddress}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="pagination-container">
              <span className="pagination-info">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} records
              </span>
              <div className="pagination-buttons">
                <button 
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <HiOutlineChevronLeft />
                  Previous
                </button>
                <button 
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <HiOutlineChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
