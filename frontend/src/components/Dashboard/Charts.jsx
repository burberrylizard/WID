import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import './Charts.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Charts({ chartData }) {
  if (!chartData) return null;

  const { alertsByHour, apTypeDistribution, alertsByType, signalHistory } = chartData;

  // Common Options
  const gridColor = 'rgba(148, 163, 184, 0.08)';
  const textColor = '#94a3b8';

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: textColor,
          font: { family: 'Inter', size: 10, weight: '600' }
        }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
      }
    }
  };

  // 1. Alert Timeline (Line Chart)
  const timelineOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      legend: {
        position: 'top',
        labels: { color: textColor, font: { family: 'Inter', size: 10, weight: '600' } }
      }
    }
  };

  // 2. AP Distribution (Doughnut Chart)
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: textColor, font: { family: 'Inter', size: 11, weight: '600' } }
      }
    },
    cutout: '70%'
  };

  // 3. Alerts by Type (Horizontal Bar Chart)
  const barOptions = {
    ...commonOptions,
    indexAxis: 'y',
    plugins: {
      ...commonOptions.plugins,
      legend: { display: false }
    }
  };

  // 4. Signal History (Line Chart)
  const signalOptions = {
    ...commonOptions,
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 9 } }
      },
      y: {
        min: -100,
        max: -30,
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 10 } },
        title: {
          display: true,
          text: 'Signal Strength (dBm)',
          color: textColor,
          font: { family: 'Inter', size: 10, weight: '600' }
        }
      }
    }
  };

  return (
    <div className="charts-grid">
      {/* Chart 1: Alert Timeline */}
      <div className="glass-card chart-card animate-fade-in-up delay-3">
        <h4 className="chart-title">Alert Frequency (24h)</h4>
        <div className="chart-container-inner">
          <Line data={alertsByHour} options={timelineOptions} />
        </div>
      </div>

      {/* Chart 2: AP Distribution */}
      <div className="glass-card chart-card animate-fade-in-up delay-4">
        <h4 className="chart-title">Access Point Security Status</h4>
        <div className="chart-container-inner">
          <Doughnut data={apTypeDistribution} options={doughnutOptions} />
        </div>
      </div>

      {/* Chart 3: Alerts By Type */}
      <div className="glass-card chart-card animate-fade-in-up delay-4">
        <h4 className="chart-title">Alert Count by Attack Vector</h4>
        <div className="chart-container-inner">
          <Bar data={alertsByType} options={barOptions} />
        </div>
      </div>

      {/* Chart 4: RSSI History */}
      <div className="glass-card chart-card animate-fade-in-up delay-5">
        <h4 className="chart-title">Signal Stability / RSSI Tracking</h4>
        <div className="chart-container-inner">
          <Line data={signalHistory} options={signalOptions} />
        </div>
      </div>
    </div>
  );
}
