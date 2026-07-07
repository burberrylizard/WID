"""
SQLAlchemy models for the WiFi Intrusion Detection System.

Tables:
  - users            : system users (admins & viewers)
  - authorized_aps   : whitelisted / trusted access points
  - detected_aps     : APs discovered during scans
  - alerts           : security alerts raised by the detection engine
  - scan_history     : per-scan summary records
"""

from datetime import datetime
from typing import Optional

import bcrypt
from app import db


# ==============================================================================
# **DATABASE**
# ==============================================================================

# ── User ────────────────────────────────────────────────────────────────────

class User(db.Model):
    """System user account."""

    __tablename__ = 'users'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id: str = db.Column(db.String(10), unique=True, nullable=False)  # e.g. 'U-001'
    full_name: str = db.Column(db.String(100), nullable=False)
    username: str = db.Column(db.String(50), unique=True, nullable=False)
    email: str = db.Column(db.String(120), unique=True, nullable=False)
    password_hash: str = db.Column(db.String(255), nullable=False)
    role: str = db.Column(db.String(20), default='viewer')  # 'admin' | 'viewer'
    is_active: bool = db.Column(db.Boolean, default=False)
    last_login: Optional[datetime] = db.Column(db.DateTime, nullable=True)
    created_at: datetime = db.Column(db.DateTime, default=datetime.utcnow)

    # ── Password helpers ────────────────────────────────────────────────

    def set_password(self, password: str) -> None:
        """Hash *password* with bcrypt and store the result."""
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        self.password_hash = hashed.decode('utf-8')

    def check_password(self, password: str) -> bool:
        """Return True when *password* matches the stored hash."""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8'),
        )

    # ── Serialisation ───────────────────────────────────────────────────

    def to_dict(self) -> dict:
        """Return a dict matching the frontend User interface."""
        return {
            'id': self.id,
            'userId': self.user_id,
            'fullName': self.full_name,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'isActive': self.is_active,
            'lastLogin': (
                self.last_login.isoformat() if self.last_login else 'Never'
            ),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<User {self.username} ({self.user_id})>'


# ── AuthorizedAP (Whitelist) ────────────────────────────────────────────────

class AuthorizedAP(db.Model):
    """An access point that has been explicitly whitelisted."""

    __tablename__ = 'authorized_aps'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ssid: str = db.Column(db.String(100), nullable=False)
    bssid: str = db.Column(db.String(17), nullable=False)  # XX:XX:XX:XX:XX:XX
    channel: int = db.Column(db.Integer, default=0)
    added_by: str = db.Column(db.String(50), default='admin')
    created_at: datetime = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'ssid': self.ssid,
            'bssid': self.bssid,
            'channel': self.channel,
            'added_by': self.added_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<AuthorizedAP {self.ssid} ({self.bssid})>'


# ── DetectedAP ──────────────────────────────────────────────────────────────

class DetectedAP(db.Model):
    """An access point discovered during a scan."""

    __tablename__ = 'detected_aps'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ssid: str = db.Column(db.String(100), nullable=True)
    bssid: str = db.Column(db.String(17), nullable=False)
    signal: int = db.Column(db.Integer, nullable=True)  # dBm, e.g. -42
    channel: int = db.Column(db.Integer, nullable=True)
    status: str = db.Column(
        db.String(20), default='unknown',
    )  # 'trusted' | 'rogue' | 'evil_twin' | 'unknown'
    authentication: Optional[str] = db.Column(db.String(50), nullable=True)
    encryption: Optional[str] = db.Column(db.String(50), nullable=True)
    scanned_at: datetime = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'ssid': self.ssid,
            'bssid': self.bssid,
            'signal': self.signal,
            'channel': self.channel,
            'status': self.status,
            'authentication': self.authentication,
            'encryption': self.encryption,
            'scanned_at': self.scanned_at.isoformat() if self.scanned_at else None,
        }

    def __repr__(self) -> str:
        return f'<DetectedAP {self.ssid} ({self.bssid}) status={self.status}>'


# ── Alert ───────────────────────────────────────────────────────────────────

class Alert(db.Model):
    """Security alert raised by the detection engine."""

    __tablename__ = 'alerts'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    alert_type: str = db.Column(
        db.String(30), nullable=False,
    )  # 'rogue_ap' | 'evil_twin' | 'signal_anomaly'
    detected_ap_id: Optional[int] = db.Column(
        db.Integer, db.ForeignKey('detected_aps.id'), nullable=True,
    )
    severity: str = db.Column(
        db.String(20), nullable=False,
    )  # 'low' | 'medium' | 'high' | 'critical'
    is_read: bool = db.Column(db.Boolean, default=False)
    ssid: str = db.Column(db.String(100), nullable=True)
    bssid: str = db.Column(db.String(17), nullable=True)
    description: str = db.Column(db.Text, nullable=True)
    created_at: datetime = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship (optional, for convenience)
    detected_ap = db.relationship('DetectedAP', backref='alerts', lazy=True)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'alert_type': self.alert_type,
            'detected_ap_id': self.detected_ap_id,
            'severity': self.severity,
            'is_read': self.is_read,
            'ssid': self.ssid,
            'bssid': self.bssid,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<Alert {self.alert_type} severity={self.severity}>'


# ── ScanHistory ─────────────────────────────────────────────────────────────

class ScanHistory(db.Model):
    """Summary record for each completed scan."""

    __tablename__ = 'scan_history'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    scan_time: datetime = db.Column(db.DateTime, default=datetime.utcnow)
    total_aps: int = db.Column(db.Integer, default=0)
    trusted: int = db.Column(db.Integer, default=0)
    rogue: int = db.Column(db.Integer, default=0)
    evil_twin: int = db.Column(db.Integer, default=0)
    unknown: int = db.Column(db.Integer, default=0)
    alerts_generated: int = db.Column(db.Integer, default=0)
    scan_method: str = db.Column(db.String(20), default='simulation')
    duration_ms: int = db.Column(db.Integer, default=0)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'scan_time': self.scan_time.isoformat() if self.scan_time else None,
            'total_aps': self.total_aps,
            'trusted': self.trusted,
            'rogue': self.rogue,
            'evil_twin': self.evil_twin,
            'unknown': self.unknown,
            'alerts_generated': self.alerts_generated,
            'scan_method': self.scan_method,
            'duration_ms': self.duration_ms,
        }

    def __repr__(self) -> str:
        return f'<ScanHistory {self.scan_time} total={self.total_aps}>'


# ── AuditLog ──────────────────────────────────────────────────────────────────

class AuditLog(db.Model):
    """Audit log tracking system operations and security-related events."""

    __tablename__ = 'audit_logs'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username: str = db.Column(db.String(50), nullable=True)  # Username of the operator
    action: str = db.Column(db.String(50), nullable=False)   # Action type (e.g. 'USER_LOGIN', 'WHITELIST_ADD')
    target: str = db.Column(db.String(100), nullable=True)   # Target entity (e.g. BSSID, userId)
    details: str = db.Column(db.Text, nullable=True)        # Human-readable details
    ip_address: str = db.Column(db.String(45), nullable=True)  # Client IP address
    created_at: datetime = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'username': self.username or 'SYSTEM',
            'action': self.action,
            'target': self.target or 'N/A',
            'details': self.details or '',
            'ipAddress': self.ip_address or 'Local',
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<AuditLog {self.action} by {self.username}>'
