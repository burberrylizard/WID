import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { whitelistAPI } from '../services/api';
import { 
   HiOutlinePlus, 
   HiOutlinePencilSquare, 
   HiOutlineTrash, 
   HiOutlineShieldCheck,
   HiXMark,
   HiOutlineChevronLeft,
   HiOutlineChevronRight
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import './WhitelistPage.css';

// ==============================================================================
// **WHITELIST CONFIGURATION**
// ==============================================================================

export default function WhitelistPage() {
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAP, setEditingAP] = useState(null);
  const [ssid, setSsid] = useState('');
  const [bssid, setBssid] = useState('');
  const [channel, setChannel] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadWhitelist = async () => {
    setLoading(true);
    try {
      const data = await whitelistAPI.getAll();
      setWhitelist(data);
    } catch (err) {
      toast.error('Failed to load whitelist data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWhitelist();
  }, []);

  // Reset page on list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [whitelist.length]);

  const openAddModal = () => {
    setEditingAP(null);
    setSsid('');
    setBssid('');
    setChannel('');
    setModalOpen(true);
  };

  const openEditModal = (ap) => {
    setEditingAP(ap);
    setSsid(ap.ssid);
    setBssid(ap.bssid);
    setChannel(ap.channel.toString());
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!ssid || !bssid) {
      toast.error('SSID and BSSID are required fields');
      return;
    }

    // Simple MAC address validation
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(bssid)) {
      toast.error('Invalid BSSID format. Use XX:XX:XX:XX:XX:XX');
      return;
    }

    try {
      if (editingAP) {
        // Edit mode
        await whitelistAPI.update(editingAP.id, {
          ssid,
          bssid: bssid.toUpperCase(),
          channel: parseInt(channel) || 0
        });
        toast.success('Authorized AP updated successfully');
      } else {
        // Add mode
        await whitelistAPI.add({
          ssid,
          bssid: bssid.toUpperCase(),
          channel: parseInt(channel) || 0
        });
        toast.success('New authorized AP added to whitelist');
      }
      setModalOpen(false);
      loadWhitelist();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove ${name || 'this AP'} from the whitelist?`)) {
      try {
        await whitelistAPI.remove(id);
        toast.success('AP removed from whitelist');
        loadWhitelist();
      } catch (err) {
        toast.error('Failed to remove AP');
      }
    }
  };

  const totalPages = Math.ceil(whitelist.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWhitelist = whitelist.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Layout title="Whitelist Manager">
      <div className="glass-card whitelist-card animate-fade-in-up">
        <div className="whitelist-header">
          <div className="whitelist-title-desc">
            <h2 className="whitelist-title">Authorized Access Points</h2>
            <p className="whitelist-subtitle">Define the baseline of whitelisted networks to trigger alerts against</p>
          </div>
          <button className="btn btn-success" onClick={openAddModal}>
            <HiOutlinePlus /> Add Authorized AP
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center w-full" style={{ height: '300px' }}>
            <div className="loading-spinner" />
          </div>
        ) : whitelist.length === 0 ? (
          <div className="empty-state">
            <HiOutlineShieldCheck className="empty-state-icon" style={{ color: 'var(--neon-green)' }} />
            <h4 className="empty-state-title">Whitelist is Empty</h4>
            <p style={{ maxWidth: '400px', marginBottom: '16px' }}>
              No access points are currently marked as friendly. Any nearby networks will be flagged as suspicious.
            </p>
            <button className="btn btn-primary btn-sm" onClick={openAddModal}>
              Create Whitelist Entry
            </button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>SSID</th>
                    <th>BSSID</th>
                    <th>Ideal Channel</th>
                    <th>Authorized By</th>
                    <th>Date Added</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedWhitelist.map((ap) => (
                    <tr key={ap.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="status-dot status-dot-active"></span>
                          <strong style={{ color: 'var(--text-primary)' }}>{ap.ssid}</strong>
                        </div>
                      </td>
                      <td className="mono">{ap.bssid}</td>
                      <td>
                        <span className="badge badge-info">{ap.channel || 'Auto'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>{ap.added_by}</span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.8rem' }}>
                          {new Date(ap.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="btn-icon" 
                          onClick={() => openEditModal(ap)} 
                          title="Edit AP details"
                        >
                          <HiOutlinePencilSquare />
                        </button>
                        <button 
                          className="btn-icon" 
                          style={{ borderColor: 'rgba(255,51,102,0.2)' }}
                          onClick={() => handleDelete(ap.id, ap.ssid)} 
                          title="Remove AP"
                        >
                          <HiOutlineTrash style={{ color: 'var(--neon-red)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, whitelist.length)} of {whitelist.length} entries
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
                {editingAP ? 'Edit Whitelist Entry' : 'Add Whitelist Entry'}
              </h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <HiXMark />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label" htmlFor="modal-ssid">SSID (Network Name)</label>
                  <input
                    id="modal-ssid"
                    type="text"
                    className="input"
                    placeholder="e.g. CorpNet_5G"
                    value={ssid}
                    onChange={(e) => setSsid(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="modal-bssid">BSSID (MAC Address)</label>
                  <input
                    id="modal-bssid"
                    type="text"
                    className="input mono"
                    placeholder="e.g. AA:BB:CC:DD:EE:FF"
                    value={bssid}
                    onChange={(e) => setBssid(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="modal-channel">Default Channel (Optional)</label>
                  <input
                    id="modal-channel"
                    type="number"
                    min="1"
                    max="165"
                    className="input"
                    placeholder="e.g. 6 or 36"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAP ? 'Apply Changes' : 'Authorize Network'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
