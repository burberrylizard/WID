import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineShieldExclamation } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    const res = await login(username, password);
    if (res.success) {
      toast.success('Successfully logged in');
      navigate('/');
    } else {
      setError(res.error);
      toast.error(res.error);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-card login-card animate-scale-in">
        <div className="login-header">
          <HiOutlineShieldExclamation className="login-logo" />
          <h2 className="login-title">WIDS</h2>
          <span className="login-subtitle">WiFi Intrusion Detection</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="input-group">
            <label className="input-label" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ marginTop: '12px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Establish Secure Connection'}
          </button>
        </form>

        <div className="login-hint">
          Demo Access: <code>admin</code> / <code>admin</code>
        </div>
      </div>
    </div>
  );
}
