import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import StatsCards from '../components/Dashboard/StatsCards';
import APTable from '../components/Dashboard/APTable';
import AlertFeed from '../components/Dashboard/AlertFeed';
import Charts from '../components/Dashboard/Charts';
import { dashboardAPI, scannerAPI, alertsAPI } from '../services/api';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import './DashboardPage.css';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [detectedAPs, setDetectedAPs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [statsRes, apRes, alertRes, chartRes] = await Promise.all([
        dashboardAPI.getStats(),
        scannerAPI.getDetectedAPs(),
        alertsAPI.getAll(),
        dashboardAPI.getChartData()
      ]);
      setStats(statsRes);
      setDetectedAPs(apRes);
      setAlerts(alertRes);
      setChartData(chartRes);
    } catch (err) {
      console.error(err);
      toast.error('Failed to reload dashboard diagnostics');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto polling every 10 seconds to simulate real-time sensor updates
    const interval = setInterval(() => {
      loadData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualScan = async () => {
    if (scanning) return;
    setScanning(true);
    const scanToast = toast.loading('Initiating RF scan on interface...');
    try {
      const res = await scannerAPI.triggerScan();
      if (res.success) {
        toast.success(`Scan complete. Found ${res.aps_found} active access points.`, {
          id: scanToast,
        });
        await loadData(false);
      }
    } catch (err) {
      toast.error('Scan execution failed.', { id: scanToast });
    } finally {
      setScanning(false);
    }
  };

  return (
    <Layout title="Airspace Dashboard">
      <div 
        className="flex items-center justify-between" 
        style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Wireless Security Center</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Active RF airspace monitoring & threat mitigation engine
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button 
            className="btn btn-ghost" 
            onClick={() => loadData(true)} 
            disabled={loading || scanning}
            title="Refresh statistics"
          >
            <HiOutlineArrowPath className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleManualScan} 
            disabled={scanning}
          >
            <HiOutlineArrowPath className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning...' : 'Trigger Scan'}
          </button>
        </div>
      </div>

      {loading ? (
        <div 
          className="flex justify-center items-center w-full" 
          style={{ height: '400px' }}
        >
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          <StatsCards stats={stats} />

          <div className="dashboard-grid">
            <div className="ap-table-wrapper">
              <APTable detectedAPs={detectedAPs} />
            </div>
            <div className="alert-feed-wrapper">
              <AlertFeed alerts={alerts} onAlertRead={() => loadData(false)} />
            </div>
          </div>

          <div className="charts-wrapper">
            <Charts chartData={chartData} />
          </div>
        </>
      )}
    </Layout>
  );
}
