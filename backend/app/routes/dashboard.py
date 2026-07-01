"""Dashboard routes for the WIDS backend."""

from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, current_app
from sqlalchemy import func
from app import db
from app.models import DetectedAP, Alert, ScanHistory

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/dashboard')


@dashboard_bp.route('/stats', methods=['GET'])
def get_stats():
    """Return aggregated dashboard statistics from the database."""
    try:
        total_aps = DetectedAP.query.count()
        trusted_aps = DetectedAP.query.filter_by(status='trusted').count()
        rogue_aps = DetectedAP.query.filter_by(status='rogue').count()
        evil_twins = DetectedAP.query.filter_by(status='evil_twin').count()
        unknown_aps = DetectedAP.query.filter_by(status='unknown').count()

        total_alerts = Alert.query.count()
        unread_alerts = Alert.query.filter_by(is_read=False).count()
        critical_alerts = Alert.query.filter_by(
            severity='critical', is_read=False
        ).count()

        last_scan_record = ScanHistory.query.order_by(
            ScanHistory.scan_time.desc()
        ).first()
        last_scan = last_scan_record.scan_time.isoformat() if last_scan_record else None

        return jsonify({
            'total_aps': total_aps,
            'trusted_aps': trusted_aps,
            'rogue_aps': rogue_aps,
            'evil_twins': evil_twins,
            'unknown_aps': unknown_aps,
            'total_alerts': total_alerts,
            'unread_alerts': unread_alerts,
            'critical_alerts': critical_alerts,
            'scanner_status': 'active',
            'last_scan': last_scan,
            'scan_interval': current_app.config.get('SCAN_INTERVAL', 30)
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch dashboard stats: {str(e)}'}), 500


@dashboard_bp.route('/charts', methods=['GET'])
def get_charts():
    """Return chart data computed from the database.

    Produces four chart datasets:
      - alertsByHour: 2-hour window grouping over the last 24 hours
      - apTypeDistribution: doughnut chart of detected AP statuses
      - alertsByType: horizontal bar chart of alert types
      - signalHistory: line chart of signal strength for top 3 BSSIDs
    """
    try:
        now = datetime.now(timezone.utc)

        # ── Color palette (matches frontend exactly) ──────────────────
        COLORS = {
            'critical':  {'border': '#ff3366', 'bg': 'rgba(255, 51, 102, 0.1)'},
            'high':      {'border': '#ff6b35', 'bg': 'rgba(255, 107, 53, 0.1)'},
            'medium':    {'border': '#ffaa00', 'bg': 'rgba(255, 170, 0, 0.1)'},
            'low':       {'border': '#00ff88', 'bg': 'rgba(0, 255, 136, 0.1)'},
            'evil_twin': {'border': '#a855f7', 'bg': 'rgba(168, 85, 247, 0.8)'},
            'cyan':      {'border': '#00d4ff', 'bg': 'rgba(0, 212, 255, 0.05)'},
        }

        AP_STATUS_COLORS = {
            'trusted':   {'border': '#00ff88', 'bg': 'rgba(0, 255, 136, 0.8)'},
            'rogue':     {'border': '#ff3366', 'bg': 'rgba(255, 51, 102, 0.8)'},
            'evil_twin': {'border': '#a855f7', 'bg': 'rgba(168, 85, 247, 0.8)'},
            'unknown':   {'border': '#ffaa00', 'bg': 'rgba(255, 170, 0, 0.8)'},
        }

        # ── 1. Alerts by Hour (2-hour windows, last 24h) ─────────────
        labels_by_hour = [f'{h:02d}:00' for h in range(0, 24, 2)]
        twenty_four_ago = now - timedelta(hours=24)

        alerts_24h = Alert.query.filter(Alert.created_at >= twenty_four_ago).all()

        severity_levels = ['critical', 'high', 'medium', 'low']
        severity_buckets = {s: [0] * 12 for s in severity_levels}

        for alert in alerts_24h:
            alert_hour = alert.created_at.hour
            bucket_index = alert_hour // 2
            sev = alert.severity if alert.severity in severity_levels else 'low'
            severity_buckets[sev][bucket_index] += 1

        alerts_by_hour_datasets = []
        for sev in severity_levels:
            color = COLORS.get(sev, COLORS['low'])
            alerts_by_hour_datasets.append({
                'label': sev.capitalize(),
                'data': severity_buckets[sev],
                'borderColor': color['border'],
                'backgroundColor': color['bg'],
                'fill': True,
                'tension': 0.4
            })

        alerts_by_hour = {
            'labels': labels_by_hour,
            'datasets': alerts_by_hour_datasets
        }

        # ── 2. AP Type Distribution (doughnut) ───────────────────────
        status_list = ['trusted', 'rogue', 'evil_twin', 'unknown']
        ap_counts = []
        ap_bg_colors = []
        ap_border_colors = []
        ap_labels = []

        for status in status_list:
            count = DetectedAP.query.filter_by(status=status).count()
            ap_counts.append(count)
            colors = AP_STATUS_COLORS.get(status, COLORS['cyan'])
            ap_bg_colors.append(colors['bg'])
            ap_border_colors.append(colors['border'])
            ap_labels.append(status.replace('_', ' ').title())

        ap_type_distribution = {
            'labels': ap_labels,
            'datasets': [{
                'data': ap_counts,
                'backgroundColor': ap_bg_colors,
                'borderColor': ap_border_colors,
                'borderWidth': 2,
                'hoverOffset': 6
            }]
        }

        # ── 3. Alerts by Type (horizontal bar) ───────────────────────
        alert_type_counts = db.session.query(
            Alert.alert_type, func.count(Alert.id)
        ).group_by(Alert.alert_type).all()

        alert_type_labels = []
        alert_type_data = []
        alert_type_bg = []
        alert_type_border = []

        type_color_map = {
            'rogue_ap':       COLORS['critical'],
            'evil_twin':      COLORS['evil_twin'],
            'unknown_ap':     COLORS['medium'],
            'deauth_attack':  COLORS['high'],
            'signal_anomaly': COLORS['cyan'],
        }

        for alert_type, count in alert_type_counts:
            alert_type_labels.append(
                alert_type.replace('_', ' ').title() if alert_type else 'Unknown'
            )
            alert_type_data.append(count)
            color = type_color_map.get(alert_type, COLORS['cyan'])
            alert_type_bg.append(color['bg'])
            alert_type_border.append(color['border'])

        alerts_by_type = {
            'labels': alert_type_labels,
            'datasets': [{
                'data': alert_type_data,
                'backgroundColor': alert_type_bg,
                'borderColor': alert_type_border,
                'borderWidth': 2
            }]
        }

        # ── 4. Signal History (line chart for top 3 BSSIDs) ──────────
        # Find the top 3 most frequently scanned BSSIDs
        top_bssids_query = db.session.query(
            DetectedAP.bssid, func.count(DetectedAP.id).label('cnt')
        ).group_by(DetectedAP.bssid).order_by(
            func.count(DetectedAP.id).desc()
        ).limit(3).all()

        signal_datasets = []
        line_colors = [
            COLORS['cyan']['border'],
            COLORS['low']['border'],
            COLORS['evil_twin']['border'],
        ]

        # Get the last 20 scans as time labels
        recent_scans = ScanHistory.query.order_by(
            ScanHistory.scan_time.desc()
        ).limit(20).all()
        recent_scans.reverse()  # Oldest first

        signal_labels = [
            scan.scan_time.strftime('%H:%M') if scan.scan_time else ''
            for scan in recent_scans
        ]

        for idx, (bssid, _count) in enumerate(top_bssids_query):
            # Get the last 20 signal readings for this BSSID
            readings = DetectedAP.query.filter_by(bssid=bssid).order_by(
                DetectedAP.scanned_at.desc()
            ).limit(20).all()
            readings.reverse()  # Oldest first

            signal_data = [r.signal if r.signal is not None else 0 for r in readings]

            # Pad or truncate to match labels length
            while len(signal_data) < len(signal_labels):
                signal_data.insert(0, None)
            signal_data = signal_data[:len(signal_labels)]

            color = line_colors[idx] if idx < len(line_colors) else COLORS['cyan']['border']
            signal_datasets.append({
                'label': bssid,
                'data': signal_data,
                'borderColor': color,
                'backgroundColor': 'transparent',
                'tension': 0.4,
                'pointRadius': 3
            })

        signal_history = {
            'labels': signal_labels if signal_labels else [],
            'datasets': signal_datasets
        }

        return jsonify({
            'alertsByHour': alerts_by_hour,
            'apTypeDistribution': ap_type_distribution,
            'alertsByType': alerts_by_type,
            'signalHistory': signal_history
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch chart data: {str(e)}'}), 500
