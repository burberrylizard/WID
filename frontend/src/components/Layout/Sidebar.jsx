import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineBell,
  HiOutlineDocumentText,
  HiOutlineArrowRightOnRectangle,
  HiOutlineShieldExclamation,
  HiOutlineUsers
} from 'react-icons/hi2';
import './Sidebar.css';

import logoImg from '../../assets/roguewatch.jpg';

export default function Sidebar({ stats, isOpen, toggleSidebar }) {
  const { user, logout } = useAuth();
  const [timeAgo, setTimeAgo] = useState('Just now');

  useEffect(() => {
    if (stats?.last_scan) {
      const updateAgo = () => {
        const diff = Date.now() - new Date(stats.last_scan).getTime();
        const secs = Math.floor(diff / 1000);
        if (secs < 60) setTimeAgo(`${secs}s ago`);
        else setTimeAgo(`${Math.floor(secs / 60)}m ago`);
      };
      updateAgo();
      const interval = setInterval(updateAgo, 10000);
      return () => clearInterval(interval);
    }
  }, [stats?.last_scan]);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div>
        <div className="sidebar-brand">
          <img src={logoImg} alt="RogueWatch Logo" className="sidebar-logo-img" />
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={toggleSidebar}>
            <div className="sidebar-link-content">
              <HiOutlineChartBar className="sidebar-link-icon" />
              <span>Dashboard</span>
            </div>
          </NavLink>

          {user?.role === 'admin' && (
            <NavLink to="/whitelist" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={toggleSidebar}>
              <div className="sidebar-link-content">
                <HiOutlineShieldCheck className="sidebar-link-icon" />
                <span>Whitelist</span>
              </div>
            </NavLink>
          )}

          <NavLink to="/alerts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={toggleSidebar}>
            <div className="sidebar-link-content">
              <HiOutlineBell className="sidebar-link-icon" />
              <span>Alerts</span>
            </div>
            {stats?.unread_alerts > 0 && (
              <span className="sidebar-badge">{stats.unread_alerts}</span>
            )}
          </NavLink>

          <NavLink to="/detection" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={toggleSidebar}>
            <div className="sidebar-link-content">
              <HiOutlineDocumentText className="sidebar-link-icon" />
              <span>Detection Logs</span>
            </div>
          </NavLink>

          {user?.role === 'admin' && (
            <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={toggleSidebar}>
              <div className="sidebar-link-content">
                <HiOutlineUsers className="sidebar-link-icon" />
                <span>User Management</span>
              </div>
            </NavLink>
          )}
        </nav>
      </div>

      <div>
        <div className="sidebar-status">
          <div className="sidebar-status-header">
            <span className={`status-dot ${stats?.scanner_status === 'active' ? 'status-dot-active' : 'status-dot-warning'}`}></span>
            <span>Scanner: {stats?.scanner_status === 'active' ? 'Active' : 'Stopped'}</span>
          </div>
          <span className="sidebar-status-time">Last scan: {timeAgo}</span>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-username">{user?.username || 'Admin'}</span>
              <span className="sidebar-role">{user?.role || 'Administrator'}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Sign Out">
            <HiOutlineArrowRightOnRectangle />
          </button>
        </div>
      </div>
    </aside>
  );
}
