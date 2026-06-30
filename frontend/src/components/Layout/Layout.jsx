import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { dashboardAPI } from '../../services/api';
import './Layout.css';

export default function Layout({ children, title }) {
  const [stats, setStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch sidebar stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll stats every 10 seconds to keep alert counts fresh
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="layout-container">
      <Sidebar stats={stats} isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="layout-main">
        <Navbar title={title} stats={stats} toggleSidebar={toggleSidebar} />
        <main className="layout-content animate-fade-in">
          {children}
        </main>
      </div>
      {sidebarOpen && (
        <div 
          className="modal-overlay" 
          onClick={toggleSidebar}
          style={{ zIndex: 8, background: 'rgba(0, 0, 0, 0.4)' }}
        />
      )}
    </div>
  );
}
