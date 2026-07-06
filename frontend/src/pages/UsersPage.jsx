import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  HiOutlineUserPlus, 
  HiOutlinePencilSquare, 
  HiOutlineTrash, 
  HiOutlineUsers,
  HiXMark,
  HiOutlineChevronLeft,
  HiOutlineChevronRight
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import './UsersPage.css';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [password, setPassword] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load user directories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Reset page when list size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [users.length]);

  const openAddModal = () => {
    if (currentUser?.role !== 'admin') {
      toast.error('Privilege escalation blocked: Only administrators can create users.');
      return;
    }
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setEmail('');
    setRole('viewer');
    setPassword('');
    setModalOpen(true);
  };

  const openEditModal = (userToEdit) => {
    if (currentUser?.role !== 'admin' && currentUser?.id !== userToEdit.id) {
      toast.error('Access Denied: You do not have permission to modify this profile.');
      return;
    }
    setEditingUser(userToEdit);
    setUsername(userToEdit.username);
    setFullName(userToEdit.fullName || '');
    setEmail(userToEdit.email);
    setRole(userToEdit.role);
    setPassword('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!username || !email || !fullName) {
      toast.error('Full Name, Username, and Email are required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!editingUser && !password) {
      toast.error('Password is required for registration');
      return;
    }

    try {
      if (editingUser) {
        // Edit mode
        await usersAPI.update(editingUser.id, {
          email,
          role,
          fullName
        });
        toast.success(`User profile "${username}" updated successfully`);
      } else {
        // Add mode
        await usersAPI.add({
          username,
          email,
          role,
          fullName,
          password
        });
        toast.success(`New user account "${username}" created`);
      }
      setModalOpen(false);
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Action execution failed');
    }
  };

  const handleDelete = async (userToDelete) => {
    if (currentUser?.role !== 'admin') {
      toast.error('Action blocked: Administrator rights required');
      return;
    }

    if (userToDelete.id === 1) {
      toast.error('Security restriction: Cannot delete the primary administrator account.');
      return;
    }

    if (currentUser?.id === userToDelete.id) {
      toast.error('Self-deletion blocked: You cannot delete your currently active session.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove user "${userToDelete.username}"?`)) {
      try {
        await usersAPI.remove(userToDelete.id);
        toast.success('User account terminated successfully');
        loadUsers();
      } catch (err) {
        toast.error(err.message || 'Failed to remove user account');
      }
    }
  };

  const isRoleEditable = () => {
    // If editing the primary admin, role must remain admin
    if (editingUser?.id === 1) return false;
    // Admins can change other roles
    return currentUser?.role === 'admin';
  };

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Layout title="User Management">
      <div className="glass-card users-card animate-fade-in-up">
        <div className="users-header">
          <div className="users-title-desc">
            <h2 className="users-title">System Users & Access Controls</h2>
            <p className="users-subtitle">Configure authorization access levels and monitor operator accounts</p>
          </div>
          {currentUser?.role === 'admin' && (
            <button className="btn btn-success" onClick={openAddModal}>
              <HiOutlineUserPlus /> Register New Operator
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center w-full" style={{ height: '300px' }}>
            <div className="loading-spinner" />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <HiOutlineUsers className="empty-state-icon" />
            <h4 className="empty-state-title">No Operators Configured</h4>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>UserID</th>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Status</th>
                    <th>Email Address</th>
                    <th>Access Role</th>
                    <th>Last Login</th>
                    <th>Created Date</th>
                    {currentUser?.role === 'admin' && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="mono" style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
                        {u.userId || `U-${String(u.id).padStart(3, '0')}`}
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                          {u.fullName || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`status-dot ${currentUser?.id === u.id ? 'status-dot-active' : ''}`}></span>
                          <span>
                            {u.username} {currentUser?.id === u.id && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>(You)</span>}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span 
                            className={`status-dot ${u.isActive ? 'status-dot-active' : ''}`} 
                            style={{ 
                              background: u.isActive ? 'var(--neon-green)' : '#475569',
                              animation: u.isActive ? 'pulse-green 2s ease-in-out infinite' : 'none' 
                            }}
                          ></span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: u.isActive ? 'var(--neon-green)' : 'var(--text-muted)' }}>
                            {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: '0.85rem' }}>{u.email}</td>
                      <td>
                        <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-viewer'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.75rem' }}>
                          {u.lastLogin === 'Never' ? (
                            <span style={{ color: 'var(--text-muted)' }}>Never</span>
                          ) : (
                            new Date(u.lastLogin).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.75rem' }}>
                          {new Date(u.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                      {currentUser?.role === 'admin' && (
                        <td className="actions-cell">
                          <button 
                            className="btn-icon" 
                            onClick={() => openEditModal(u)} 
                            title="Edit operator settings"
                          >
                            <HiOutlinePencilSquare />
                          </button>
                          {u.id !== 1 && currentUser?.id !== u.id && (
                            <button 
                              className="btn-icon" 
                              style={{ borderColor: 'rgba(255,51,102,0.2)' }}
                              onClick={() => handleDelete(u)} 
                              title="Deauthorize operator"
                            >
                              <HiOutlineTrash style={{ color: 'var(--neon-red)' }} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, users.length)} of {users.length} operators
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

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale-in">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? 'Modify Operator Settings' : 'Register New Operator'}
              </h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <HiXMark />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label" htmlFor="user-fullname">Full Name</label>
                  <input
                    id="user-fullname"
                    type="text"
                    className="input"
                    placeholder="e.g. John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="user-username">Username</label>
                  <input
                    id="user-username"
                    type="text"
                    className="input"
                    placeholder="e.g. jdoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!!editingUser} // Cannot change username after creation
                  />
                </div>

                {!editingUser && (
                  <div className="input-group">
                    <label className="input-label" htmlFor="user-password">Password</label>
                    <input
                      id="user-password"
                      type="password"
                      className="input"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label" htmlFor="user-email">Email Address</label>
                  <input
                    id="user-email"
                    type="email"
                    className="input"
                    placeholder="e.g. operator@wids.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="user-role">Authorization Level</label>
                  <select 
                    id="user-role"
                    className="input" 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={!isRoleEditable()}
                  >
                    <option value="viewer">Viewer (Read-Only Diagnostics)</option>
                    <option value="admin">Administrator (Full Read/Write Controls)</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Save Operator Settings' : 'Register Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
