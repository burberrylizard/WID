from flask import request
from app import db
from app.models import AuditLog

def log_activity(action: str, target: str = None, details: str = None, username: str = None):
    """
    Utility function to write an activity to the AuditLog database.
    Captures client IP address and dynamically retrieves username from X-User-Username header.
    """
    if not username:
        try:
            username = request.headers.get('X-User-Username')
        except Exception:
            pass

    try:
        ip = request.remote_addr
    except Exception:
        ip = "Local"

    try:
        log_entry = AuditLog(
            username=username,
            action=action,
            target=target,
            details=details,
            ip_address=ip
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        import logging
        logging.getLogger(__name__).error(f"Failed to write audit log entry: {str(e)}")
