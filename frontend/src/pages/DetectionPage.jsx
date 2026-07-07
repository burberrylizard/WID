import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { scannerAPI, alertsAPI } from '../services/api';
import { generatePDFReport } from '../services/reportGenerator';
import { 
  HiOutlineArrowPath, 
  HiOutlineCpuChip, 
  HiOutlineClock,
  HiOutlineSignal,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineArrowDownTray
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import './DetectionPage.css';

// ==============================================================================
// **DETECTION HISTORY LOGS**
// ==============================================================================

export default function DetectionPage() {
  const { user } = useAuth();
  const [scannerStatus, setScannerStatus] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadScannerData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        scannerAPI.getStatus(),
        scannerAPI.getScanHistory()
      ]);
      setScannerStatus(statusRes);
      setScanHistory(historyRes);
    } catch (err) {
      toast.error('Failed to retrieve sensor properties');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadScannerData();
  }, []);

  // Reset page when list size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [scanHistory.length]);

  const handleRunManualScan = async () => {
    if (user?.role !== 'admin') {
      toast.error('Privilege escalation blocked: Sweep execution is administrative only.');
      return;
    }
    if (scanning) return;
    setScanning(true);
    const scanToast = toast.loading('Establishing channel sweep...');
    try {
      const res = await scannerAPI.triggerScan();
      if (res.success) {
        toast.success(`Sweep finished. Recorded ${res.aps_found} active access points.`, {
          id: scanToast,
        });
        await loadScannerData(false);
      }
    } catch (err) {
      toast.error('Sweep execution failed.', { id: scanToast });
    } finally {
      setScanning(false);
    }
  };

  const handleExportReport = async () => {
    const reportToast = toast.loading('Compiling airspace survey data...');
    try {
      const [apRes, alertRes, statsRes] = await Promise.all([
        scannerAPI.getDetectedAPs(),
        alertsAPI.getAll(),
        scannerAPI.getStatus()
      ]);
      
      const statsPayload = {
        scanner_status: statsRes.status,
        last_scan: statsRes.last_scan,
        trusted_aps: apRes.filter(ap => ap.status === 'trusted').length,
        rogue_aps: apRes.filter(ap => ap.status === 'rogue').length,
        evil_twins: apRes.filter(ap => ap.status === 'evil_twin').length,
        unread_alerts: alertRes.filter(a => !a.is_read).length
      };

      generatePDFReport({
        stats: statsPayload,
        detectedAPs: apRes,
        alerts: alertRes,
        user
      });
      toast.success('Security report downloaded successfully.', { id: reportToast });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export security report.', { id: reportToast });
    }
  };

  const getMethodBadgeClass = (method) => {
    switch (method) {
      case 'pywifi': return 'badge-info';
      case 'netsh': return 'badge-trusted';
      default: return 'badge-evil-twin';
    }
  };

  const totalScans = scanHistory.length;
  const avgDuration = totalScans > 0 
    ? Math.round(scanHistory.reduce((acc, curr) => acc + curr.duration_ms, 0) / totalScans) 
    : 0;

  const totalPages = Math.ceil(scanHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHistory = scanHistory.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Layout title="Detection Logs">
      <div className="detection-grid animate-fade-in-up">
        {/* Left Side: Scanner Settings / Current Status */}
        <div className="glass-card scanner-config-card">
          <h3 className="scanner-config-title">Scanner Configuration</h3>

          <div className="scanner-config-status">
            <span className={`status-dot ${scannerStatus?.status === 'active' ? 'status-dot-active' : 'status-dot-warning'}`}></span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {scannerStatus?.status === 'active' ? 'SENSOR ACTIVE' : 'SENSOR PAUSED'}
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sweeping frequency channels</span>
            </div>
          </div>

          <div className="scanner-config-detail">
            <div className="scanner-detail-row">
              <span className="scanner-detail-label">Scanning Driver</span>
              <span className={`badge ${getMethodBadgeClass(scannerStatus?.method)}`}>
                {scannerStatus?.method?.toUpperCase() || 'NETSH'}
              </span>
            </div>

            <div className="scanner-detail-row">
              <span className="scanner-detail-label">Sweep Interval</span>
              <span className="scanner-detail-value">{scannerStatus?.interval || 30}s</span>
            </div>

            <div className="scanner-detail-row">
              <span className="scanner-detail-label">Total Scans Run</span>
              <span className="scanner-detail-value">{totalScans} runs</span>
            </div>

            <div className="scanner-detail-row">
              <span className="scanner-detail-label">Avg Sweep Time</span>
              <span className="scanner-detail-value">{avgDuration} ms</span>
            </div>
          </div>

          {user?.role === 'admin' && (
            <button 
              className="btn btn-primary w-full" 
              onClick={handleRunManualScan}
              disabled={scanning}
              style={{ marginTop: 'auto' }}
            >
              <HiOutlineArrowPath className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Running Sweep...' : 'Trigger Manual Sweep'}
            </button>
          )}
        </div>

        {/* Right Side: Scan Sweep History List */}
        <div className="glass-card detection-history-card">
          <div className="detection-history-header">
            <div>
              <h3 className="scanner-config-title">Sweep History Logs</h3>
              <p className="whitelist-subtitle">Chronological logs of historical radio sweeps and security checks</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleExportReport} disabled={loading}>
              <HiOutlineArrowDownTray /> Export PDF Report
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center w-full" style={{ height: '300px' }}>
              <div className="loading-spinner" />
            </div>
          ) : scanHistory.length === 0 ? (
            <div className="empty-state">
              <HiOutlineCpuChip className="empty-state-icon" />
              <h4 className="empty-state-title">No Scan Logs Recorded</h4>
              <p>Execute your first scan to generate sweep history.</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Sweep Time</th>
                      <th>Driver</th>
                      <th>Total APs</th>
                      <th>Trusted</th>
                      <th>Rogue</th>
                      <th>Evil Twin</th>
                      <th>Unknown</th>
                      <th>Alerts</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <HiOutlineClock style={{ color: 'var(--text-muted)' }} />
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                              {new Date(log.scan_time).toLocaleString('en-US')}
                            </strong>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getMethodBadgeClass(log.scan_method)}`} style={{ fontSize: '0.7rem' }}>
                            {log.scan_method}
                          </span>
                        </td>
                        <td className="mono">{log.total_aps}</td>
                        <td>
                          <span className="mono" style={{ color: 'var(--neon-green)' }}>{log.trusted}</span>
                        </td>
                        <td>
                          <span className="mono" style={{ color: 'var(--neon-red)' }}>{log.rogue}</span>
                        </td>
                        <td>
                          <span className="mono" style={{ color: 'var(--neon-purple)' }}>{log.evil_twin}</span>
                        </td>
                        <td>
                          <span className="mono" style={{ color: 'var(--neon-amber)' }}>{log.unknown}</span>
                        </td>
                        <td>
                          {log.alerts_generated > 0 ? (
                            <span className="badge badge-critical" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                              {log.alerts_generated} Alerts
                            </span>
                          ) : (
                            <span className="badge badge-low" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>Clean</span>
                          )}
                        </td>
                        <td>
                          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {log.duration_ms} ms
                          </span>
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
                    Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, scanHistory.length)} of {scanHistory.length} sweeps
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
      </div>
    </Layout>
  );
}
