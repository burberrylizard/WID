"""Whitelist (Authorized AP) routes for the WIDS backend."""

from flask import Blueprint, request, jsonify
from app import db
from app.models import AuthorizedAP, DetectedAP

whitelist_bp = Blueprint('whitelist', __name__, url_prefix='/whitelist')


@whitelist_bp.route('/', methods=['GET'])
def get_whitelist():
    """Return all authorized APs as a JSON list."""
    try:
        aps = AuthorizedAP.query.all()
        return jsonify([ap.to_dict() for ap in aps]), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch whitelist: {str(e)}'}), 500


@whitelist_bp.route('/', methods=['POST'])
def add_to_whitelist():
    """Add a new AP to the whitelist.

    Body: {ssid, bssid, channel}
    Also marks any DetectedAP with matching BSSID as 'trusted'.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        ssid = data.get('ssid')
        bssid = data.get('bssid')
        channel = data.get('channel')

        if not ssid or not bssid:
            return jsonify({'error': 'SSID and BSSID are required'}), 400

        # Create the new authorized AP
        new_ap = AuthorizedAP(
            ssid=ssid,
            bssid=bssid,
            channel=channel
        )
        db.session.add(new_ap)

        # Update any detected APs with matching BSSID to 'trusted'
        detected_matches = DetectedAP.query.filter_by(bssid=bssid).all()
        for detected in detected_matches:
            detected.status = 'trusted'

        db.session.commit()

        from app.services.audit_logger import log_activity
        log_activity('WHITELIST_ADD', target=bssid, details=f"Added SSID '{ssid}' with BSSID '{bssid}' to authorized whitelist")

        return jsonify({
            'success': True,
            'ap': new_ap.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add to whitelist: {str(e)}'}), 500


@whitelist_bp.route('/<int:id>', methods=['PUT'])
def update_whitelist(id):
    """Update an existing authorized AP.

    Body: {ssid, bssid, channel}
    """
    try:
        ap = AuthorizedAP.query.get(id)
        if not ap:
            return jsonify({'error': 'Authorized AP not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        if 'ssid' in data:
            ap.ssid = data['ssid']
        if 'bssid' in data:
            ap.bssid = data['bssid']
        if 'channel' in data:
            ap.channel = data['channel']

        db.session.commit()

        from app.services.audit_logger import log_activity
        log_activity('WHITELIST_UPDATE', target=ap.bssid, details=f"Updated whitelist entry ID {id} to SSID '{ap.ssid}', BSSID '{ap.bssid}', channel {ap.channel}")

        return jsonify({
            'success': True,
            'ap': ap.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update whitelist entry: {str(e)}'}), 500


@whitelist_bp.route('/<int:id>', methods=['DELETE'])
def delete_from_whitelist(id):
    """Delete an AP from the whitelist and re-classify detected APs.

    If a detected AP's BSSID was in the whitelist and is now removed,
    check if its SSID matches another whitelist entry -> 'evil_twin',
    otherwise -> 'rogue'.
    """
    try:
        ap = AuthorizedAP.query.get(id)
        if not ap:
            return jsonify({'error': 'Authorized AP not found'}), 404

        removed_bssid = ap.bssid

        # Delete the authorized AP
        db.session.delete(ap)
        db.session.flush()

        # Re-classify detected APs whose BSSID matched the removed entry
        # Check if the BSSID is still authorized by another entry
        still_authorized = AuthorizedAP.query.filter_by(bssid=removed_bssid).first()

        if not still_authorized:
            # Find all detected APs with this BSSID
            detected_aps = DetectedAP.query.filter_by(bssid=removed_bssid).all()
            for detected in detected_aps:
                # Check if the SSID matches any remaining whitelist entry
                ssid_match = AuthorizedAP.query.filter_by(ssid=detected.ssid).first()
                if ssid_match:
                    # SSID matches but BSSID doesn't — evil twin
                    detected.status = 'evil_twin'
                else:
                    # No match at all — rogue
                    detected.status = 'rogue'

        db.session.commit()

        from app.services.audit_logger import log_activity
        log_activity('WHITELIST_DELETE', target=removed_bssid, details=f"Removed SSID '{ap.ssid}' with BSSID '{removed_bssid}' from whitelist")

        return jsonify({'success': True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete whitelist entry: {str(e)}'}), 500
