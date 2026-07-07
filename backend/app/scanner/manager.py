"""
manager.py — Scanner driver manager.

Automatically selects the best available WiFi scanning backend:
  1. ``NetshScanner`` — if ``netsh wlan`` is functional on this Windows host.
  2. ``SimulatorScanner`` — fallback for development / non-Windows systems.
"""

import logging
import subprocess
from datetime import datetime, timezone

from app.scanner.netsh_scanner import NetshScanner
from app.scanner.simulator import SimulatorScanner

logger = logging.getLogger(__name__)


# ==============================================================================
# **Wireless Scanner Manager**
# ==============================================================================

class ScannerManager:
    """
    High-level scanner facade.

    On construction the manager probes for a working ``netsh wlan``
    interface.  If that fails, it falls back silently to the simulator.
    """

    def __init__(self) -> None:
        self._last_scan: datetime | None = None
        self._primary_method: str = "simulation"    # default
        self._primary_scanner: NetshScanner | SimulatorScanner

        if self._netsh_available():
            self._primary_scanner = NetshScanner()
            self._primary_method = "netsh"
            logger.info("ScannerManager: using NetshScanner (live WiFi)")
        else:
            self._primary_scanner = SimulatorScanner()
            self._primary_method = "simulation"
            logger.info("ScannerManager: netsh unavailable — using SimulatorScanner")

        # Always keep a simulator ready as a fallback
        self._fallback_scanner = SimulatorScanner()

    # ------------------------------------------------------------------ #
    # Public API                                                          #
    # ------------------------------------------------------------------ #

    def scan(self) -> tuple[list[dict], str]:
        """
        Run a WiFi scan and return ``(results, method_name)``.

        *method_name* is ``'netsh'`` or ``'simulation'``.
        If the primary driver fails at runtime, the manager transparently
        falls back to the simulator.
        """
        try:
            results = self._primary_scanner.scan()
            method = self._primary_method
        except Exception as exc:
            logger.warning(
                "Primary scanner (%s) failed: %s — falling back to simulator",
                self._primary_method,
                exc,
            )
            results = self._fallback_scanner.scan()
            method = "simulation"

        self._last_scan = datetime.now(timezone.utc)
        logger.debug(
            "Scan complete via %s: %d networks found", method, len(results)
        )
        return results, method

    def get_status(self) -> dict:
        """
        Return a status snapshot of the scanner subsystem.

        Example::

            {
                "status": "active",
                "method": "netsh",
                "last_scan": "2026-06-30T12:34:56+00:00",
                "interval": 30
            }
        """
        return {
            "status": "active",
            "method": self._primary_method,
            "last_scan": self._last_scan.isoformat() if self._last_scan else None,
            "interval": 30,
        }

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _netsh_available() -> bool:
        """
        Return ``True`` if ``netsh wlan show interfaces`` runs successfully.
        """
        try:
            result = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                capture_output=True,
                timeout=10,
                encoding="cp437",
                errors="ignore",
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            return False
