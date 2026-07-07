"""Scanner routes for the WIDS backend."""

from flask import Blueprint, jsonify
from app import db
from app.models import DetectedAP, ScanHistory

scanner_bp = Blueprint('scanner', __name__, url_prefix='/scanner')


@scanner_bp.route('/detected', methods=['GET'])
def get_detected_aps():
    """Return all detected APs ordered by scanned_at DESC."""
    try:
        aps = DetectedAP.query.order_by(DetectedAP.scanned_at.desc()).all()
        return jsonify([ap.to_dict() for ap in aps]), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch detected APs: {str(e)}'}), 500


@scanner_bp.route('/trigger', methods=['POST'])
def trigger_scan():
    """Trigger a new Wi-Fi scan.

    Imports ScannerManager and DetectionEngine, runs a scan,
    processes results, and returns a summary.
    """
    try:
        from app.scanner.manager import ScannerManager
        from app.detection.engine import DetectionEngine

        scanner = ScannerManager()
        scan_results, scan_method = scanner.scan()

        engine = DetectionEngine(db)
        summary = engine.process_scan(scan_results, scan_method)

        return jsonify({
            'success': True,
            'aps_found': summary['total_aps'],
            'scan_method': summary['scan_method']
        }), 200

    except ImportError as e:
        return jsonify({
            'success': False,
            'error': f'Scanner modules not available: {str(e)}',
            'aps_found': 0,
            'scan_method': 'unavailable'
        }), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Scan failed: {str(e)}'
        }), 500


@scanner_bp.route('/history', methods=['GET'])
def get_scan_history():
    """Return all scan history records ordered by scan_time DESC."""
    try:
        history = ScanHistory.query.order_by(ScanHistory.scan_time.desc()).all()
        return jsonify([record.to_dict() for record in history]), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch scan history: {str(e)}'}), 500


@scanner_bp.route('/status', methods=['GET'])
def get_scanner_status():
    """Return the current scanner status."""
    try:
        from app.scanner.manager import ScannerManager

        scanner = ScannerManager()
        status = scanner.get_status()

        return jsonify(status), 200

    except ImportError:
        from flask import current_app
        return jsonify({
            'status': 'active',
            'method': 'simulation',
            'last_scan': None,
            'interval': current_app.config.get('SCAN_INTERVAL', 30)
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to get scanner status: {str(e)}'}), 500
