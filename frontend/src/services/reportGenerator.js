import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a corporate-grade PDF security audit report client-side.
 * 
 * @param {Object} data Report input payload.
 * @param {Object} data.stats Current dashboard statistics.
 * @param {Array} data.detectedAPs Currently detected Access Points list.
 * @param {Array} data.alerts Security alert log entries.
 * @param {Object} data.user Current logged-in operator.
 */
export const generatePDFReport = (data) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { stats, detectedAPs, alerts, user } = data;

  // Primary Theme Colors (matches RogueWatch CSS system)
  const primaryColor = [6, 10, 19];      // Deep Navy (#060a13)
  const secondaryColor = [10, 14, 26];    // Indigo Slate (#0a0e1a)
  const cyanColor = [0, 212, 255];        // Neon Cyan (#00d4ff)
  const greenColor = [0, 200, 110];       // Neon Green (#00c86e)
  const redColor = [255, 51, 102];        // Neon Red (#ff3366)
  const amberColor = [255, 150, 0];       // Neon Amber (#ff9600)
  const textMuted = [100, 116, 139];      // Gray Slate (#64748b)

  // 1. Header Banner
  doc.setFillColor(...secondaryColor);
  doc.rect(0, 0, 210, 45, 'F');

  // Title text
  doc.setTextColor(...cyanColor);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ROGUEWATCH', 15, 20);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text('Enterprise Wireless Intrusion Detection System', 15, 26);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('Helvetica', 'bold');
  doc.text('AIRSPACE SECURITY SURVEY', 115, 20, { align: 'left' });

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 115, 26);
  doc.text(`Operator: ${user?.fullName || user?.username || 'System Administrator'} (${(user?.role || 'admin').toUpperCase()})`, 115, 31);

  // Banner Border Line
  doc.setFillColor(...cyanColor);
  doc.rect(0, 45, 210, 1.5, 'F');

  // 2. Executive Summary Cards
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
  doc.text('EXECUTIVE INCIDENT SUMMARY', 15, 58);

  const boxWidth = 42;
  const boxHeight = 22;
  const boxY = 63;
  const startX = 15;
  const gap = 8;

  const boxes = [
    { label: 'Sensor Status', value: stats?.scanner_status === 'active' ? 'ACTIVE' : 'STANDBY', color: cyanColor },
    { label: 'Friendly Whitelist', value: `${stats?.trusted_aps || 0} APs`, color: greenColor },
    { label: 'Threats Flagged', value: `${(stats?.rogue_aps || 0) + (stats?.evil_twins || 0)} Threat(s)`, color: redColor },
    { label: 'Unread Incident(s)', value: `${stats?.unread_alerts || 0} Alerts`, color: amberColor }
  ];

  boxes.forEach((box, i) => {
    const x = startX + i * (boxWidth + gap);
    
    // Draw box border and background
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.setFillColor(248, 250, 252);
    doc.rect(x, boxY, boxWidth, boxHeight, 'FD');

    // Colored top-indicator bar
    doc.setFillColor(...box.color);
    doc.rect(x, boxY, boxWidth, 1.5, 'F');

    // Label
    doc.setTextColor(...textMuted);
    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'bold');
    doc.text(box.label.toUpperCase(), x + boxWidth / 2, boxY + 8, { align: 'center' });

    // Value
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('Helvetica', 'bold');
    doc.text(box.value, x + boxWidth / 2, boxY + 16, { align: 'center' });
  });

  // 3. Section: Incident Alerts
  let currentY = 96;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
  doc.text('THREAT INCIDENT LOGS (RECENT ALERTS)', 15, currentY);

  const alertRows = alerts.map(a => [
    a.severity.toUpperCase(),
    a.alert_type === 'evil_twin' ? 'EVIL TWIN' : a.alert_type.replace('_', ' ').toUpperCase(),
    a.ssid || '<Hidden SSID>',
    a.bssid || 'N/A',
    a.description,
    new Date(a.created_at).toLocaleString()
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Severity', 'Threat Type', 'Target SSID', 'BSSID (MAC)', 'Incident Description', 'Timestamp']],
    body: alertRows.length > 0 ? alertRows : [['CLEAN', 'N/A', 'N/A', 'N/A', 'No threat activities detected in the monitored airspace.', 'N/A']],
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 25 },
      2: { cellWidth: 32 },
      3: { cellWidth: 28 },
      4: { cellWidth: 57 },
      5: { cellWidth: 25 }
    },
    didParseCell: (data) => {
      if (data.column.index === 0 && data.cell.section === 'body') {
        const val = data.cell.raw;
        if (val === 'CRITICAL' || val === 'HIGH') {
          data.cell.styles.textColor = redColor;
        } else if (val === 'MEDIUM') {
          data.cell.styles.textColor = amberColor;
        } else if (val === 'LOW') {
          data.cell.styles.textColor = greenColor;
        }
      }
    }
  });

  // 4. Section: Monitored Airspace Diagnostics
  currentY = doc.lastAutoTable.finalY + 12;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
  doc.text('MONITORED AIRSPACE SENSOR SURVEY (DETECTED APs)', 15, currentY);

  const apRows = detectedAPs.map(ap => [
    ap.status.toUpperCase(),
    ap.ssid || '<Hidden SSID>',
    ap.bssid,
    `${ap.signal} dBm`,
    ap.channel,
    ap.authentication || 'Open',
    new Date(ap.scanned_at).toLocaleString()
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Status', 'SSID Name', 'BSSID (MAC Address)', 'Signal', 'CH', 'Security Profile', 'Scanned Time']],
    body: apRows.length > 0 ? apRows : [['N/A', 'No scanned networks', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A']],
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22 }
    },
    didParseCell: (data) => {
      if (data.column.index === 0 && data.cell.section === 'body') {
        const val = data.cell.raw;
        if (val === 'TRUSTED') {
          data.cell.styles.textColor = greenColor;
        } else if (val === 'EVIL_TWIN' || val === 'ROGUE') {
          data.cell.styles.textColor = redColor;
        } else if (val === 'UNKNOWN') {
          data.cell.styles.textColor = amberColor;
        }
      }
    }
  });

  // 5. Add dynamic footers with page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, 280, 195, 280);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text('CONFIDENTIAL DOCUMENT — Generated by RogueWatch security sensor network. Internal enterprise use only.', 15, 285);
    doc.text(`Page ${i} of ${pageCount}`, 195, 285, { align: 'right' });
  }

  // Save the report
  const filename = `RogueWatch_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
};
