"""Alert routes for the WIDS backend."""

from flask import Blueprint, request, jsonify
from app import db
from app.models import Alert

alerts_bp = Blueprint('alerts', __name__, url_prefix='/alerts')


@alerts_bp.route('/', methods=['GET'])
def get_alerts():
    """Return filtered alerts sorted by created_at DESC.

    Query params:
        severity — filter by severity level
        type     — filter by alert_type
        is_read  — 'true' or 'false'
    """
    try:
        query = Alert.query

        # Apply filters from query params
        severity = request.args.get('severity')
        if severity:
            query = query.filter_by(severity=severity)

        alert_type = request.args.get('type')
        if alert_type:
            query = query.filter_by(alert_type=alert_type)

        is_read = request.args.get('is_read')
        if is_read is not None:
            if is_read.lower() == 'true':
                query = query.filter_by(is_read=True)
            elif is_read.lower() == 'false':
                query = query.filter_by(is_read=False)

        alerts = query.order_by(Alert.created_at.desc()).all()
        return jsonify([alert.to_dict() for alert in alerts]), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch alerts: {str(e)}'}), 500


@alerts_bp.route('/recent', methods=['GET'])
def get_recent_alerts():
    """Return the most recent N alerts.

    Query params:
        limit — number of alerts to return (default: 5)
    """
    try:
        limit = request.args.get('limit', 5, type=int)
        alerts = Alert.query.order_by(Alert.created_at.desc()).limit(limit).all()
        return jsonify([alert.to_dict() for alert in alerts]), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch recent alerts: {str(e)}'}), 500


@alerts_bp.route('/<int:id>/read', methods=['PUT'])
def mark_alert_read(id):
    """Mark a single alert as read."""
    try:
        alert = Alert.query.get(id)
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404

        alert.is_read = True
        db.session.commit()

        return jsonify({'success': True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to mark alert as read: {str(e)}'}), 500


@alerts_bp.route('/mark-all-read', methods=['PUT'])
def mark_all_alerts_read():
    """Mark all alerts as read."""
    try:
        Alert.query.filter_by(is_read=False).update({'is_read': True})
        db.session.commit()

        return jsonify({'success': True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to mark all alerts as read: {str(e)}'}), 500
