"""
netsh_scanner.py — Windows WiFi scanner using the 'netsh wlan' command.

Runs `netsh wlan show networks mode=bssid` as a subprocess and parses the
structured text output into a list of dictionaries, one per detected AP.
"""

import logging
import re
import subprocess

logger = logging.getLogger(__name__)


class NetshScanner:
    """Scan nearby WiFi networks on Windows via netsh."""

    # ------------------------------------------------------------------ #
    #  The netsh output is a series of blocks that look like this:        #
    #                                                                     #
    #  SSID 1 : HomeNetwork_5G                                           #
    #      Network type            : Infrastructure                      #
    #      Authentication          : WPA2-Personal                       #
    #      Encryption              : CCMP                                #
    #      BSSID 1                 : a4:cf:12:d3:45:67                   #
    #                       Signal : 85%                                 #
    #                      Channel : 36                                  #
    #                                                                     #
    #  An SSID block may contain multiple BSSIDs (multi-AP roaming).     #
    # ------------------------------------------------------------------ #

    # Regex helpers (case-insensitive, allowing variable whitespace)
    _RE_SSID   = re.compile(r"^SSID\s+\d+\s*:\s*(.*)", re.IGNORECASE)
    _RE_BSSID  = re.compile(r"^\s*BSSID\s+\d+\s*:\s*([0-9a-fA-F:]{17})", re.IGNORECASE)
    _RE_SIGNAL = re.compile(r"Signal\s*:\s*(\d+)%", re.IGNORECASE)
    _RE_CHAN   = re.compile(r"Channel\s*:\s*(\d+)", re.IGNORECASE)
    _RE_AUTH   = re.compile(r"Authentication\s*:\s*(.*)", re.IGNORECASE)
    _RE_ENC    = re.compile(r"Encryption\s*:\s*(.*)", re.IGNORECASE)

    # --------------------------------------------------------------------- #
    # Public API                                                              #
    # --------------------------------------------------------------------- #

    def scan(self) -> list[dict]:
        """
        Execute a netsh scan and return a list of AP dictionaries.

        Each dict contains:
            ssid, bssid, signal (dBm int), channel (int),
            authentication, encryption

        Raises
        ------
        RuntimeError
            If netsh is unavailable or the subprocess fails.
        """
        # Trigger a hardware scan using pywifi if available to refresh the Windows OS cache
        try:
            import pywifi
            import time
            wifi = pywifi.PyWiFi()
            if len(wifi.interfaces()) > 0:
                iface = wifi.interfaces()[0]
                logger.info("NetshScanner: Triggering hardware scan via %s...", iface.name())
                iface.scan()
                time.sleep(2.5) # Give the hardware adapter time to populate the scan results
        except Exception as e:
            logger.warning("NetshScanner: Could not trigger hardware scan via pywifi: %s", e)

        raw_output = self._run_netsh()
        networks = self._parse_output(raw_output)
        logger.debug("NetshScanner found %d networks", len(networks))
        return networks

    # --------------------------------------------------------------------- #
    # Internal helpers                                                        #
    # --------------------------------------------------------------------- #

    @staticmethod
    def _run_netsh() -> str:
        """Run netsh and return its stdout as a string."""
        try:
            result = subprocess.run(
                ["netsh", "wlan", "show", "networks", "mode=bssid"],
                capture_output=True,
                timeout=15,
                # Windows console pages often use cp437; fall back to utf-8
                # with errors='ignore' so we never crash on encoding quirks.
                encoding="cp437",
                errors="ignore",
            )
        except FileNotFoundError:
            raise RuntimeError(
                "netsh is not available on this system. "
                "Are you running on Windows with a WiFi adapter?"
            )
        except subprocess.TimeoutExpired:
            raise RuntimeError("netsh command timed out after 15 seconds.")

        if result.returncode != 0:
            stderr_text = (result.stderr or "").strip()
            raise RuntimeError(
                f"netsh exited with code {result.returncode}: {stderr_text}"
            )

        return result.stdout

    @classmethod
    def _parse_output(cls, raw: str) -> list[dict]:
        """
        Parse the raw netsh text into a flat list of AP dicts.

        Strategy:
        - Walk line by line, tracking the *current* SSID-level fields
          (ssid, authentication, encryption).
        - When a BSSID line is encountered, start collecting BSSID-level
          fields (bssid, signal, channel).
        - A new SSID or BSSID line (or end-of-output) commits the
          previous BSSID record.
        """
        networks: list[dict] = []
        current_ssid: str | None = None
        current_auth: str = "Unknown"
        current_enc: str = "Unknown"

        # BSSID-level accumulators
        current_bssid: str | None = None
        current_signal: int | None = None
        current_channel: int | None = None

        def _commit_bssid():
            """Push the current BSSID record (if any) into the results."""
            if current_bssid is not None:
                networks.append({
                    "ssid": current_ssid or "",
                    "bssid": current_bssid.upper(),
                    "signal": current_signal if current_signal is not None else -100,
                    "channel": current_channel if current_channel is not None else 0,
                    "authentication": current_auth,
                    "encryption": current_enc,
                })

        for line in raw.splitlines():
            line = line.rstrip()

            # --- SSID line (starts a new SSID block) ---
            m = cls._RE_SSID.match(line)
            if m:
                _commit_bssid()                     # flush previous BSSID
                current_ssid = m.group(1).strip()
                current_auth = "Unknown"
                current_enc = "Unknown"
                current_bssid = None
                current_signal = None
                current_channel = None
                logger.debug("Parsed SSID: %s", current_ssid)
                continue

            # --- Authentication ---
            m = cls._RE_AUTH.search(line)
            if m and current_bssid is None:
                # Auth appears at SSID level (before any BSSID)
                current_auth = m.group(1).strip()
                continue

            # --- Encryption ---
            m = cls._RE_ENC.search(line)
            if m and current_bssid is None:
                current_enc = cls._map_encryption(m.group(1).strip())
                continue

            # --- BSSID line (starts a new BSSID sub-block) ---
            m = cls._RE_BSSID.match(line)
            if m:
                _commit_bssid()                     # flush previous BSSID
                current_bssid = m.group(1).strip()
                current_signal = None
                current_channel = None
                continue

            # --- Signal (inside a BSSID block) ---
            m = cls._RE_SIGNAL.search(line)
            if m and current_bssid is not None:
                pct = int(m.group(1))
                current_signal = cls._percent_to_dbm(pct)
                continue

            # --- Channel (inside a BSSID block) ---
            m = cls._RE_CHAN.search(line)
            if m and current_bssid is not None:
                current_channel = int(m.group(1))
                continue

        # Flush the last BSSID record (if any)
        _commit_bssid()

        return networks

    # --------------------------------------------------------------------- #
    # Conversion / mapping helpers                                            #
    # --------------------------------------------------------------------- #

    @staticmethod
    def _percent_to_dbm(percent: int) -> int:
        """
        Convert a signal strength percentage (0-100) to an approximate
        dBm value using the linear formula: dBm = (percent / 2) - 100.

        Examples:
            100% → -50 dBm
             50% →  -75 dBm
              0% → -100 dBm
        """
        return int((percent / 2) - 100)

    @staticmethod
    def _map_encryption(raw_cipher: str) -> str:
        """
        Normalise the 'Encryption' / 'Cipher' string from netsh.

        Common values from netsh: CCMP, TKIP, GCMP, GCMP-256, WEP, None.
        We pass them through mostly unchanged but clean up whitespace and
        map 'None' → 'None' explicitly for clarity.
        """
        value = raw_cipher.strip()
        if value.lower() == "none":
            return "None"
        return value
