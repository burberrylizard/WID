import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineShieldExclamation,
  HiOutlineExclamationTriangle,
  HiOutlineSignal,
  HiOutlineArrowRight
} from 'react-icons/hi2';
import { alertsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './AlertFeed.css';

export default function AlertFeed({ alerts, onAlertRead }) {
  const navigate = useNavigate();

  const getAlertIcon = (type, severity) => {
    switch (type) {
      case 'evil_twin':
        return <HiOutlineShieldExclamation className={`alert-feed-icon critical`} />;
      case 'rogue_ap':
        return <HiOutlineExclamationTriangle className={`alert-feed-icon high`} />;
      default:
        return <HiOutlineSignal className={`alert-feed-icon low`} />;
    }
  };

  const getAlertTitle = (type) => {
    switch (type) {
      case 'evil_twin': return 'Evil Twin Detected';
      case 'rogue_ap': return 'Rogue AP Detected';
      case 'signal_anomaly': return 'Signal Anomaly';
      default: return 'Intrusion Alert';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical': return 'badge-critical';
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  const handleAlertClick = async (alert) => {
    if (!alert.is_read) {
      try {
        await alertsAPI.markAsRead(alert.id);
        toast.success('Alert marked as read');
        if (onAlertRead) onAlertRead();
      } catch (err) {
        toast.error('Failed to update alert status');
      }
    }
  };

  const recentAlerts = alerts.slice(0, 5);
  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="glass-card alert-feed-card animate-fade-in-up delay-3">
      <div className="alert-feed-header">
        <h3 className="alert-feed-title">
          Recent Alerts
          {unreadCount > 0 && <span className="status-dot status-dot-danger"></span>}
        </h3>
        {unreadCount > 0 && (
          <span className="badge badge-critical">{unreadCount} New</span>
        )}
      </div>

      <div className="alert-feed-list">
        {recentAlerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <span className="empty-state-title" style={{ fontSize: '0.9rem' }}>No Alerts Logged</span>
            <p style={{ fontSize: '0.75rem' }}>Airspace is currently secure.</p>
          </div>
        ) : (
          recentAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`alert-feed-item ${!alert.is_read ? `unread unread-${alert.severity}` : ''}`}
              onClick={() => handleAlertClick(alert)}
            >
              <div className="alert-feed-meta">
                <span className="alert-feed-type">
                  {getAlertIcon(alert.alert_type, alert.severity)}
                  <span>{getAlertTitle(alert.alert_type)}</span>
                </span>
                <span className="alert-feed-time">
                  {new Date(alert.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>

              <div className="alert-feed-target">
                <span>{alert.ssid || '<Hidden>'}</span>
                <span className={`badge ${getSeverityBadge(alert.severity)}`} style={{ fontSize: '0.65rem' }}>
                  {alert.severity}
                </span>
              </div>

              <p className="alert-feed-desc">{alert.description}</p>
            </div>
          ))
        )}
      </div>

      <div className="alert-feed-footer">
        <button className="btn btn-ghost btn-sm alert-feed-more" onClick={() => navigate('/alerts')}>
          View All Security Alerts <HiOutlineArrowRight />
        </button>
      </div>
    </div>
  );
}
