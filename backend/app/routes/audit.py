"""Audit logging routes for the WIDS backend."""

from flask import Blueprint, jsonify, request
from app.models import AuditLog

audit_bp = Blueprint('audit', __name__, url_prefix='/audit')

# ==============================================================================
# **AUDIT LOGS RETRIEVAL**
# ==============================================================================

@audit_bp.route('/', methods=['GET'])
def get_audit_logs():
    """Return paginated list of audit logs, sorted by timestamp descending."""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        username_filter = request.args.get('username', '').strip()
        action_filter = request.args.get('action', '').strip()

        query = AuditLog.query

        if username_filter:
            query = query.filter(AuditLog.username.ilike(f"%{username_filter}%"))
        if action_filter:
            query = query.filter(AuditLog.action.ilike(f"%{action_filter}%"))

        # Paginate results
        paginated_logs = query.order_by(AuditLog.created_at.desc()).paginate(
            page=page, per_page=limit, error_out=False
        )

        return jsonify({
            'logs': [log.to_dict() for log in paginated_logs.items],
            'total': paginated_logs.total,
            'pages': paginated_logs.pages,
            'current_page': paginated_logs.page
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to retrieve audit logs: {str(e)}'}), 500
