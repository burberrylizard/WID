"""
background.py — Background WiFi scanning service.

Runs a daemon thread that periodically scans for WiFi networks,
classifies them through the detection engine, and stores results
in the database.
"""

import logging
import threading
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class BackgroundScanner:
    """
    Daemon-threaded WiFi scanner that runs continuously in the background.

    Usage::

        bg = BackgroundScanner(app)
        bg.start()          # non-blocking; spawns a daemon thread
        # ...
        bg.stop()           # signals the thread to exit gracefully
    """

    def __init__(self, app) -> None:
        """
        Parameters
        ----------
        app : flask.Flask
            The Flask application instance (needed for app context).
        """
        self.app = app
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------ #
    # Public API                                                          #
    # ------------------------------------------------------------------ #

    def start(self) -> None:
        """Spawn the background scanning thread (daemon, non-blocking)."""
        if self._thread is not None and self._thread.is_alive():
            logger.warning("BackgroundScanner is already running")
            return

        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._scan_loop,
            name="wids-background-scanner",
            daemon=True,
        )
        self._thread.start()
        logger.info("BackgroundScanner started")

    def stop(self) -> None:
        """Signal the scanning loop to exit after the current cycle."""
        self._stop_event.set()
        logger.info("BackgroundScanner stop requested")

    # ------------------------------------------------------------------ #
    # Internal loop                                                        #
    # ------------------------------------------------------------------ #

    def _scan_loop(self) -> None:
        """
        Main loop executed inside the daemon thread.

        1. Sleep for ``SCAN_INTERVAL`` seconds (default 30).
        2. Within a Flask app context, run a scan and process results.
        3. Repeat until the stop event is set.
        """
        interval: int = self.app.config.get("SCAN_INTERVAL", 30)
        logger.info(
            "Background scan loop started (interval=%ds)", interval
        )

        while not self._stop_event.is_set():
            # Wait for the configured interval (or until stop is signalled)
            if self._stop_event.wait(timeout=interval):
                # stop_event was set during the wait → exit
                break

            try:
                self._execute_scan_cycle()
            except Exception as exc:
                # Never let an unhandled exception kill the thread
                logger.exception(
                    "Unhandled error in background scan cycle: %s", exc
                )

        logger.info("Background scan loop exited")

    def _execute_scan_cycle(self) -> None:
        """Run a single scan-→-detect cycle inside the Flask app context."""
        # Import here to avoid circular imports at module load time
        from app import db
        from app.scanner.manager import ScannerManager
        from app.detection.engine import DetectionEngine

        with self.app.app_context():
            scanner = ScannerManager()
            engine = DetectionEngine(db)

            scan_results, method = scanner.scan()
            summary = engine.process_scan(scan_results, method)

            logger.info(
                "Background scan complete — method=%s  total=%d  "
                "trusted=%d  rogue=%d  evil_twin=%d  unknown=%d  "
                "alerts=%d  duration=%dms",
                summary["scan_method"],
                summary["total_aps"],
                summary["trusted"],
                summary["rogue"],
                summary["evil_twin"],
                summary["unknown"],
                summary["alerts_generated"],
                summary["duration_ms"],
            )
