import React, { useState, useEffect } from 'react';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';
import './APTable.css';

export default function APTable({ detectedAPs }) {
  const [sortField, setSortField] = useState('signal');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when detectedAPs list changes or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [detectedAPs.length, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedAPs = () => {
    return [...detectedAPs].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle undefined / nulls
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSignalStrengthClass = (signal) => {
    if (signal >= -50) return 'signal-excellent';
    if (signal >= -65) return 'signal-good';
    if (signal >= -75) return 'signal-fair';
    return 'signal-weak';
  };

  const getStatusDotClass = (status) => {
    switch (status) {
      case 'trusted': return 'status-dot-active';
      case 'evil_twin':
      case 'rogue': return 'status-dot-danger';
      default: return 'status-dot-warning';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'trusted': return 'badge-trusted';
      case 'evil_twin': return 'badge-evil-twin';
      case 'rogue': return 'badge-rogue';
      default: return 'badge-unknown';
    }
  };

  const formatStatusText = (status) => {
    if (status === 'evil_twin') return 'Evil Twin';
    return status;
  };

  const sortedAPs = getSortedAPs();
  const totalPages = Math.ceil(sortedAPs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAPs = sortedAPs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="glass-card ap-table-card animate-fade-in-up delay-2">
      <div className="ap-table-header">
        <div>
          <h3 className="ap-table-title">Detected Access Points</h3>
          <p className="ap-table-subtitle">WiFi scan data from nearby airspace</p>
        </div>
        <span className="badge badge-info">{detectedAPs.length} Networks Found</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="sortable-header" onClick={() => handleSort('status')}>
                Status {sortField === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('ssid')}>
                SSID {sortField === 'ssid' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('bssid')}>
                BSSID {sortField === 'bssid' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('signal')}>
                Signal {sortField === 'signal' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('channel')}>
                CH {sortField === 'channel' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th>Security</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAPs.map((ap) => (
              <tr 
                key={`${ap.bssid}-${ap.ssid}`} 
                className={ap.status === 'evil_twin' || ap.status === 'rogue' ? 'row-danger' : ''}
              >
                <td>
                  <span className={`status-dot ${getStatusDotClass(ap.status)}`}></span>
                </td>
                <td>
                  <div className="ssid-container">
                    <span className="ssid-name">{ap.ssid || '<Hidden>'}</span>
                    <span className={`badge ${getStatusBadgeClass(ap.status)}`}>
                      {formatStatusText(ap.status)}
                    </span>
                  </div>
                </td>
                <td className="bssid-cell">{ap.bssid}</td>
                <td>
                  <div className="signal-cell">
                    <div className={`signal-bar ${getSignalStrengthClass(ap.signal)}`}>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="signal-value">{ap.signal} dBm</span>
                  </div>
                </td>
                <td>
                  <span className="mono">{ap.channel || 'N/A'}</span>
                </td>
                <td>
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                    {ap.authentication || 'Open'}
                  </span>
                </td>
                <td>
                  <span className="mono" style={{ fontSize: '0.75rem' }}>
                    {new Date(ap.scanned_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination" style={{ padding: '16px 20px', marginTop: '0' }}>
          <span className="pagination-info">
            Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, sortedAPs.length)} of {sortedAPs.length} networks
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
    </div>
  );
}
