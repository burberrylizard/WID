import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { alertsAPI } from '../services/api';
import { 
  HiOutlineShieldExclamation,
  HiOutlineExclamationTriangle,
  HiOutlineSignal,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCheckCircle,
  HiOutlineEye
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import './AlertsPage.css';

// ==============================================================================
// **INTRUSION ALERTS MONITOR**
// ==============================================================================

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (severityFilter) filters.severity = severityFilter;
      if (typeFilter) filters.type = typeFilter;
      if (readFilter !== '') filters.is_read = readFilter === 'read';

      const data = await alertsAPI.getAll(filters);
      setAlerts(data);
      setCurrentPage(1); // Reset page on filter change
    } catch (err) {
      toast.error('Failed to retrieve security alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [severityFilter, typeFilter, readFilter]);

  const handleRowClick = async (id, isRead) => {
    setExpandedId(expandedId === id ? null : id);
    if (!isRead && user?.role === 'admin') {
      try {
        await alertsAPI.markAsRead(id);
        // Silently reload in-memory alerts state to mark as read without full loading spinner
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (user?.role !== 'admin') {
      toast.error('Privilege escalation blocked: Admin role required.');
      return;
    }
    try {
      await alertsAPI.markAllAsRead();
      toast.success('All alerts marked as read');
      loadAlerts();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'evil_twin':
        return <HiOutlineShieldExclamation className="alert-feed-icon critical" />;
      case 'rogue_ap':
        return <HiOutlineExclamationTriangle className="alert-feed-icon high" />;
      default:
        return <HiOutlineSignal className="alert-feed-icon low" />;
    }
  };

  const getAlertTitle = (type) => {
    switch (type) {
      case 'evil_twin': return 'Evil Twin Attack';
      case 'rogue_ap': return 'Rogue Access Point';
      case 'signal_anomaly': return 'Signal Anomaly';
      default: return 'Intrusion Alert';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical': return 'badge-critical';
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      case 'low': return 'badge-low';
      default: return 'badge-info';
    }
  };

  // Pagination helper
  const totalPages = Math.ceil(alerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAlerts = alerts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Layout title="Security Alerts">
      <div className="glass-card alerts-card animate-fade-in-up">
        <div className="alerts-header">
          <div>
            <h2 className="whitelist-title">Threat Incident Log</h2>
            <p className="whitelist-subtitle">Historical list of detected anomalies and intrusive incidents</p>
          </div>

          {user?.role === 'admin' && (
            <div className="alerts-summary-actions">
              <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead} disabled={alerts.every(a => a.is_read)}>
                <HiOutlineCheckCircle /> Mark All Read
              </button>
            </div>
          )}
        </div>

        {/* Filter controls */}
        <div className="filter-bar">
          <div className="input-group filter-item">
            <label className="input-label" htmlFor="filter-severity">Severity</label>
            <select 
              id="filter-severity"
              className="input" 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="input-group filter-item">
            <label className="input-label" htmlFor="filter-type">Alert Type</label>
            <select 
              id="filter-type"
              className="input" 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="evil_twin">Evil Twin</option>
              <option value="rogue_ap">Rogue AP</option>
              <option value="signal_anomaly">Signal Anomaly</option>
            </select>
          </div>

          <div className="input-group filter-item">
            <label className="input-label" htmlFor="filter-status">Status</label>
            <select 
              id="filter-status"
              className="input" 
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center w-full" style={{ height: '300px' }}>
            <div className="loading-spinner" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <HiOutlineCheckCircle className="empty-state-icon" style={{ color: 'var(--neon-green)' }} />
            <h4 className="empty-state-title">No Incidents Found</h4>
            <p>No alerts fit the selected filter profiles.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Type</th>
                    <th>SSID</th>
                    <th>BSSID</th>
                    <th>Description Summary</th>
                    <th>Detected Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAlerts.map((alert) => {
                    const isExpanded = expandedId === alert.id;
                    const unreadAccent = !alert.is_read ? `unread-accent-${alert.severity}` : '';

                    return (
                      <React.Fragment key={alert.id}>
                        <tr 
                          onClick={() => handleRowClick(alert.id, alert.is_read)}
                          style={{ cursor: 'pointer' }}
                          className={`${!alert.is_read ? 'row-danger' : ''} ${unreadAccent}`}
                        >
                          <td>
                            <span className={`badge ${getSeverityBadge(alert.severity)}`}>
                              {alert.severity}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {getAlertIcon(alert.alert_type)}
                              <span>{getAlertTitle(alert.alert_type)}</span>
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{alert.ssid || '<Hidden>'}</strong>
                          </td>
                          <td className="mono">{alert.bssid || 'N/A'}</td>
                          <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {alert.description}
                          </td>
                          <td>
                            <span className="mono" style={{ fontSize: '0.8rem' }}>
                              {new Date(alert.created_at).toLocaleString('en-US')}
                            </span>
                          </td>
                          <td>
                            <button className="btn-icon" title="View details">
                              <HiOutlineEye />
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="row-expanded-container">
                              <div className="row-expanded-content animate-scale-in">
                                <h5 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Incident Details</h5>
                                <p style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                                  {alert.description}
                                </p>
                                <div className="flex gap-4" style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  <span>Incident ID: {alert.id}</span>
                                  <span>|</span>
                                  <span>Status: {alert.is_read ? 'Read / Acknowledged' : 'New / Unread'}</span>
                                  <span>|</span>
                                  <span>Epoch Code: {new Date(alert.created_at).getTime()}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, alerts.length)} of {alerts.length} alerts
                </span>

                <div className="pagination-controls">
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <HiOutlineChevronLeft /> Prev
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next <HiOutlineChevronRight />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
