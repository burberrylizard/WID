import React from 'react';
import {
  HiOutlineWifi,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineBell
} from 'react-icons/hi2';
import './StatsCards.css';

export default function StatsCards({ stats }) {
  const totalAPs = stats?.total_aps || 0;
  const trustedAPs = stats?.trusted_aps || 0;
  const threats = (stats?.rogue_aps || 0) + (stats?.evil_twins || 0);
  const activeAlerts = stats?.unread_alerts || 0;

  return (
    <div className="stats-grid">
      <div className="glass-card stat-card animate-fade-in-up delay-1">
        <div className="stat-icon-container stat-icon-cyan">
          <HiOutlineWifi />
        </div>
        <div className="stat-info">
          <span className="stat-value">{totalAPs}</span>
          <span className="stat-label">Total APs</span>
          <span className="stat-trend trend-up">Scan Active</span>
        </div>
      </div>

      <div className="glass-card stat-card animate-fade-in-up delay-2">
        <div className="stat-icon-container stat-icon-green">
          <HiOutlineShieldCheck />
        </div>
        <div className="stat-info">
          <span className="stat-value">{trustedAPs}</span>
          <span className="stat-label">Trusted APs</span>
          <span className="stat-trend trend-up">Authorized</span>
        </div>
      </div>

      <div className="glass-card stat-card animate-fade-in-up delay-3">
        <div className="stat-icon-container stat-icon-red">
          <HiOutlineExclamationTriangle />
        </div>
        <div className="stat-info">
          <span className="stat-value">{threats}</span>
          <span className="stat-label">Threats</span>
          <span className={`stat-trend ${threats > 0 ? 'trend-down' : 'trend-up'}`}>
            {threats > 0 ? `${threats} Active Threat(s)` : 'No threats detected'}
          </span>
        </div>
      </div>

      <div className="glass-card stat-card animate-fade-in-up delay-4">
        <div className="stat-icon-container stat-icon-amber">
          <HiOutlineBell />
        </div>
        <div className="stat-info">
          <span className="stat-value">{activeAlerts}</span>
          <span className="stat-label">Active Alerts</span>
          <span className={`stat-trend ${activeAlerts > 0 ? 'trend-down' : 'trend-up'}`}>
            {activeAlerts > 0 ? `${activeAlerts} unread alerts` : 'All alerts read'}
          </span>
        </div>
      </div>
    </div>
  );
}
