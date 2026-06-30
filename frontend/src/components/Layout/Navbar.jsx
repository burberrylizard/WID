import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiBars3, HiMagnifyingGlass, HiOutlineBell } from 'react-icons/hi2';
import './Navbar.css';

export default function Navbar({ title, stats, toggleSidebar }) {
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-toggle" onClick={toggleSidebar}>
          <HiBars3 />
        </button>
        <h1 className="navbar-title">{title}</h1>
      </div>

      <div className="navbar-right">
        <div className="navbar-search">
          <HiMagnifyingGlass className="navbar-search-icon" />
          <input
            type="text"
            placeholder="Search networks or alerts..."
            className="input navbar-search-input"
          />
        </div>

        <div className="navbar-badge-container">
          <span className={`status-dot ${stats?.scanner_status === 'active' ? 'status-dot-active' : 'status-dot-warning'}`}></span>
          <span>SYSTEM ONLINE</span>
        </div>

        <div className="navbar-actions">
          <button 
            className="btn-icon navbar-btn-icon" 
            onClick={() => navigate('/alerts')}
            title="Notifications"
          >
            <HiOutlineBell />
            {stats?.unread_alerts > 0 && <span className="navbar-btn-badge"></span>}
          </button>
        </div>
      </div>
    </header>
  );
}
