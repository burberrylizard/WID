"""
engine.py — WiFi Intrusion Detection engine.

Classifies scanned access points against the authorised whitelist and
generates alerts for evil twins, rogue APs, and signal anomalies.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class DetectionEngine:
    """
    Core detection logic.

    Takes raw scan results, compares them to the authorised AP whitelist
    stored in the database, and creates ``Alert`` / ``ScanHistory``
    records as appropriate.
    """

    def __init__(self, db) -> None:
        """
        Parameters
        ----------
        db : flask_sqlalchemy.SQLAlchemy
            The SQLAlchemy database session proxy (``db.session``).
        """
        self.db = db

    # ------------------------------------------------------------------ #
    # Primary entry point                                                  #
    # ------------------------------------------------------------------ #

    def process_scan(self, scan_results: list[dict], scan_method: str) -> dict:
        """
        Classify every AP in *scan_results* and persist the outcome.

        Parameters
        ----------
        scan_results : list[dict]
            Each dict has keys: ssid, bssid, signal, channel,
            authentication, encryption.
        scan_method : str
            ``'netsh'`` or ``'simulation'``.

        Returns
        -------
        dict
            Summary with keys: total_aps, trusted, rogue, evil_twin,
            unknown, alerts_generated, scan_method, duration_ms.
        """
        from app.models import AuthorizedAP, DetectedAP, Alert, ScanHistory

        start = datetime.now(timezone.utc)

        # ---- 1. Fetch authorised APs -------------------------------- #
        try:
            authorized_aps = AuthorizedAP.query.all()
        except Exception as exc:
            logger.error("Failed to query AuthorizedAP table: %s", exc)
            authorized_aps = []

        # Build fast-lookup structures
        authorized_bssids: set[str] = {
            ap.bssid.upper() for ap in authorized_aps
        }
        # SSID → [list of authorised BSSIDs for that SSID]
        authorized_ssids: dict[str, list[str]] = {}
        for ap in authorized_aps:
            authorized_ssids.setdefault(ap.ssid, []).append(ap.bssid.upper())

        # ---- 2. Classify each scanned AP ----------------------------- #
        counts = {"trusted": 0, "rogue": 0, "evil_twin": 0, "unknown": 0}
        alerts_generated = 0

        for ap_data in scan_results:
            bssid = ap_data.get("bssid", "").upper()
            ssid = ap_data.get("ssid", "")
            signal = ap_data.get("signal", -100)
            channel = ap_data.get("channel", 0)
            auth = ap_data.get("authentication", "Unknown")
            enc = ap_data.get("encryption", "Unknown")

            # --- Classification logic -------------------------------- #
            if bssid in authorized_bssids:
                status = "trusted"
            elif ssid in authorized_ssids and bssid not in authorized_bssids:
                status = "evil_twin"
            elif signal > -60 and auth == "Open":
                status = "rogue"
            elif signal > -70:
                status = "rogue"
            else:
                status = "unknown"

            counts[status] += 1

            # --- Check for signal anomaly on known BSSIDs ------------- #
            self.check_signal_anomaly(bssid, signal)

            # --- Upsert into DetectedAP ------------------------------ #
            try:
                existing = DetectedAP.query.filter_by(bssid=bssid).first()
                now = datetime.now(timezone.utc)

                if existing:
                    existing.ssid = ssid
                    existing.signal = signal
                    existing.channel = channel
                    existing.authentication = auth
                    existing.encryption = enc
                    existing.status = status
                    existing.scanned_at = now
                else:
                    new_ap = DetectedAP(
                        ssid=ssid,
                        bssid=bssid,
                        signal=signal,
                        channel=channel,
                        authentication=auth,
                        encryption=enc,
                        status=status,
                        scanned_at=now,
                    )
                    self.db.session.add(new_ap)
            except Exception as exc:
                logger.error("DetectedAP upsert failed for %s: %s", bssid, exc)

            # --- Create alerts for threats ---------------------------- #
            if status == "evil_twin":
                self._create_alert(
                    alert_type="evil_twin",
                    severity="critical",
                    ssid=ssid,
                    bssid=bssid,
                    description=(
                        f"Evil Twin detected: SSID '{ssid}' seen on "
                        f"unauthorised BSSID {bssid} "
                        f"(signal {signal} dBm, channel {channel})"
                    ),
                )
                alerts_generated += 1

            elif status == "rogue":
                severity = "high" if (signal > -60 and auth == "Open") else "medium"
                self._create_alert(
                    alert_type="rogue_ap",
                    severity=severity,
                    ssid=ssid,
                    bssid=bssid,
                    description=(
                        f"Rogue AP detected: '{ssid}' at {bssid} "
                        f"(signal {signal} dBm, auth={auth}, enc={enc})"
                    ),
                )
                alerts_generated += 1

        # ---- 3. Record scan history ---------------------------------- #
        duration_ms = int(
            (datetime.now(timezone.utc) - start).total_seconds() * 1000
        )

        try:
            scan_record = ScanHistory(
                scan_time=datetime.now(timezone.utc),
                total_aps=len(scan_results),
                trusted=counts["trusted"],
                rogue=counts["rogue"],
                evil_twin=counts["evil_twin"],
                unknown=counts["unknown"],
                alerts_generated=alerts_generated,
                scan_method=scan_method,
                duration_ms=duration_ms,
            )
            self.db.session.add(scan_record)
            self.db.session.commit()
        except Exception as exc:
            logger.error("Failed to commit scan results: %s", exc)
            self.db.session.rollback()

        summary = {
            "total_aps": len(scan_results),
            "trusted": counts["trusted"],
            "rogue": counts["rogue"],
            "evil_twin": counts["evil_twin"],
            "unknown": counts["unknown"],
            "alerts_generated": alerts_generated,
            "scan_method": scan_method,
            "duration_ms": duration_ms,
        }
        logger.info("Scan processed: %s", summary)
        return summary

    # ------------------------------------------------------------------ #
    # Signal anomaly detection                                             #
    # ------------------------------------------------------------------ #

    def check_signal_anomaly(self, bssid: str, new_signal: int) -> bool:
        """
        Compare *new_signal* against the last-known signal for *bssid*.

        If the absolute difference exceeds 30 dBm the change is flagged
        as anomalous (possible physical move or spoofing).

        Returns ``True`` if an anomaly was detected.
        """
        from app.models import DetectedAP

        try:
            existing = DetectedAP.query.filter_by(bssid=bssid).first()
            if existing and existing.signal is not None:
                delta = abs(new_signal - existing.signal)
                if delta > 30:
                    logger.warning(
                        "Signal anomaly on %s: %d dBm → %d dBm (Δ%d)",
                        bssid, existing.signal, new_signal, delta,
                    )
                    self._create_alert(
                        alert_type="signal_anomaly",
                        severity="low",
                        ssid=existing.ssid,
                        bssid=bssid,
                        description=(
                            f"Signal anomaly on {bssid}: previous "
                            f"{existing.signal} dBm → {new_signal} dBm "
                            f"(delta {delta} dBm)"
                        ),
                    )
                    return True
        except Exception as exc:
            logger.error("Signal anomaly check failed for %s: %s", bssid, exc)

        return False

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    def _create_alert(
        self,
        alert_type: str,
        severity: str,
        ssid: str,
        bssid: str,
        description: str,
    ) -> None:
        """Persist an ``Alert`` record. Errors are logged, never raised."""
        from app.models import Alert

        try:
            alert = Alert(
                alert_type=alert_type,
                severity=severity,
                ssid=ssid,
                bssid=bssid,
                description=description,
                created_at=datetime.now(timezone.utc),
                is_read=False,
            )
            self.db.session.add(alert)
            # Don't commit here — the caller commits in bulk after the loop.
            logger.info(
                "Alert created [%s/%s]: %s", severity, alert_type, description
            )
        except Exception as exc:
            logger.error("Failed to create alert: %s", exc)
