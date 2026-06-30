"""
mailer.py — Email notification service for WIDS alerts.

Sends formatted email notifications for high-severity and critical
alerts using Flask-Mail.  If mail is disabled in configuration the
service degrades gracefully to a log message.
"""

import logging

logger = logging.getLogger(__name__)


class MailerService:
    """
    Thin wrapper around Flask-Mail for sending WIDS alert emails.

    Usage::

        mailer = MailerService(app)
        mailer.send_alert_email({
            "severity": "CRITICAL",
            "alert_type": "evil_twin",
            "ssid": "HomeNetwork_5G",
            "bssid": "DE:AD:BE:EF:00:01",
            "description": "Evil Twin detected …",
            "timestamp": "2026-06-30T12:34:56+00:00",
        })
    """

    def __init__(self, app) -> None:
        """
        Parameters
        ----------
        app : flask.Flask
            The Flask application instance.
        """
        self.app = app

    # ------------------------------------------------------------------ #
    # Public API                                                          #
    # ------------------------------------------------------------------ #

    def send_alert_email(self, alert_dict: dict) -> None:
        """
        Send an email notification for a WIDS alert.

        Parameters
        ----------
        alert_dict : dict
            Must contain keys: severity, alert_type, ssid, bssid,
            description, timestamp.

        The email is only sent when ``MAIL_ENABLED`` is truthy in the
        Flask config.  Otherwise, a debug log message is emitted.
        """
        mail_enabled = self.app.config.get("MAIL_ENABLED", False)

        if not mail_enabled:
            logger.debug(
                "Email alerts disabled — skipping notification for "
                "[%s] %s on %s",
                alert_dict.get("severity", "?"),
                alert_dict.get("alert_type", "?"),
                alert_dict.get("bssid", "?"),
            )
            return

        # Only notify on HIGH and CRITICAL alerts
        severity = alert_dict.get("severity", "").upper()
        if severity not in ("HIGH", "CRITICAL"):
            logger.debug(
                "Skipping email for %s-severity alert (only HIGH/CRITICAL "
                "are mailed)", severity,
            )
            return

        try:
            self._send(alert_dict)
        except Exception as exc:
            # Never let a mail failure crash the application
            logger.error(
                "Failed to send alert email for %s: %s",
                alert_dict.get("bssid", "?"),
                exc,
            )

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    def _send(self, alert_dict: dict) -> None:
        """Build and dispatch the email via Flask-Mail."""
        from flask_mail import Mail, Message

        severity = alert_dict.get("severity", "UNKNOWN")
        alert_type = alert_dict.get("alert_type", "unknown")
        ssid = alert_dict.get("ssid", "N/A")
        bssid = alert_dict.get("bssid", "N/A")
        description = alert_dict.get("description", "")
        timestamp = alert_dict.get("timestamp", "N/A")

        subject = f"[WIDS Alert] {severity.upper()}: {alert_type} detected"

        body = (
            f"WiFi Intrusion Detection System — Alert Notification\n"
            f"{'=' * 55}\n\n"
            f"Severity   : {severity}\n"
            f"Alert Type : {alert_type}\n"
            f"SSID       : {ssid}\n"
            f"BSSID      : {bssid}\n"
            f"Timestamp  : {timestamp}\n\n"
            f"Description:\n{description}\n\n"
            f"---\n"
            f"This is an automated message from the WIDS backend.\n"
        )

        recipients = self.app.config.get("MAIL_ALERT_RECIPIENTS", [])
        if not recipients:
            logger.warning(
                "MAIL_ALERT_RECIPIENTS is empty — cannot send alert email"
            )
            return

        with self.app.app_context():
            mail = Mail(self.app)
            msg = Message(
                subject=subject,
                recipients=recipients,
                body=body,
            )
            mail.send(msg)

        logger.info(
            "Alert email sent to %s — [%s] %s",
            recipients, severity, alert_type,
        )
