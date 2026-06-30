"""
simulator.py — Mock WiFi scanner for development and testing.

Generates realistic scan results without requiring a real WiFi adapter.
Includes a fixed set of "trusted" networks plus probabilistic injection
of Evil Twin and Rogue AP threats for exercising the detection engine.
"""

import logging
import random
import string

logger = logging.getLogger(__name__)


class SimulatorScanner:
    """Produce simulated WiFi scan results for testing."""

    # ------------------------------------------------------------------ #
    # Base set of trusted / whitelisted networks                          #
    # ------------------------------------------------------------------ #
    _TRUSTED_NETWORKS: list[dict] = [
        {
            "ssid": "HomeNetwork_5G",
            "bssid": "A4:CF:12:D3:45:67",
            "signal_base": -42,
            "channel": 36,
            "authentication": "WPA2-Personal",
            "encryption": "CCMP",
        },
        {
            "ssid": "HomeNetwork_2G",
            "bssid": "A4:CF:12:D3:45:68",
            "signal_base": -55,
            "channel": 6,
            "authentication": "WPA2-Personal",
            "encryption": "CCMP",
        },
        {
            "ssid": "SchoolWiFi",
            "bssid": "00:1A:2B:3C:4D:5E",
            "signal_base": -60,
            "channel": 1,
            "authentication": "WPA2-Enterprise",
            "encryption": "CCMP",
        },
        {
            "ssid": "SchoolWiFi",
            "bssid": "00:1A:2B:3C:4D:5F",
            "signal_base": -68,
            "channel": 11,
            "authentication": "WPA2-Enterprise",
            "encryption": "CCMP",
        },
        {
            "ssid": "LabNetwork",
            "bssid": "B8:27:EB:12:34:56",
            "signal_base": -50,
            "channel": 44,
            "authentication": "WPA3-Personal",
            "encryption": "GCMP-256",
        },
        {
            "ssid": "OfficeGuest",
            "bssid": "DC:A6:32:AA:BB:CC",
            "signal_base": -58,
            "channel": 6,
            "authentication": "WPA2-Personal",
            "encryption": "CCMP",
        },
    ]

    # Suspicious SSIDs used when injecting rogue open APs
    _ROGUE_SSIDS: list[str] = [
        "FreeWiFi_Hack",
        "FREE_INTERNET",
        "Open_Network",
        "Free_Public_WiFi",
        "WiFi_Gratis",
        "SETUP",
        "linksys",
    ]

    # Innocuous neighbor SSIDs (weak, background noise)
    _NEIGHBOR_SSIDS: list[str] = [
        "NETGEAR-Neighbor",
        "TP-Link_Apt302",
        "xfinitywifi",
        "ATT-Home-9F2",
        "Linksys07841",
    ]

    # ------------------------------------------------------------------ #
    # Public API                                                          #
    # ------------------------------------------------------------------ #

    def scan(self) -> list[dict]:
        """
        Generate a simulated scan result list.

        Returns the same dict format as ``NetshScanner.scan()``:
        ``[{ssid, bssid, signal, channel, authentication, encryption}, …]``
        """
        results: list[dict] = []

        # 1. Always include all trusted networks (with signal jitter)
        for net in self._TRUSTED_NETWORKS:
            results.append(self._jitter_network(net))

        # 2. With 30 % probability, inject an Evil Twin for a random
        #    whitelisted SSID (same SSID, different BSSID, strong signal)
        if random.random() < 0.30:
            evil = self._make_evil_twin()
            results.append(evil)
            logger.debug("Simulator injected Evil Twin: %s", evil)

        # 3. With 20 % probability, inject a Rogue AP (open, no encryption)
        if random.random() < 0.20:
            rogue = self._make_rogue_ap()
            results.append(rogue)
            logger.debug("Simulator injected Rogue AP: %s", rogue)

        # 4. Always include 2 weak neighbor networks
        results.extend(self._make_neighbors(count=2))

        logger.debug("SimulatorScanner produced %d networks", len(results))
        return results

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _jitter_network(base: dict) -> dict:
        """Return a copy of *base* with ±3 dBm random signal jitter."""
        return {
            "ssid": base["ssid"],
            "bssid": base["bssid"],
            "signal": base["signal_base"] + random.randint(-3, 3),
            "channel": base["channel"],
            "authentication": base["authentication"],
            "encryption": base["encryption"],
        }

    @classmethod
    def _make_evil_twin(cls) -> dict:
        """
        Create an Evil Twin AP that copies a random whitelisted SSID
        but uses a different (random) BSSID and a strong signal.
        """
        victim = random.choice(cls._TRUSTED_NETWORKS)
        return {
            "ssid": victim["ssid"],
            "bssid": cls._random_bssid(),
            "signal": random.randint(-40, -35),   # very strong
            "channel": victim["channel"],
            "authentication": victim["authentication"],
            "encryption": victim["encryption"],
        }

    @classmethod
    def _make_rogue_ap(cls) -> dict:
        """Create a rogue open AP with a suspicious SSID."""
        return {
            "ssid": random.choice(cls._ROGUE_SSIDS),
            "bssid": cls._random_bssid(),
            "signal": random.randint(-55, -40),    # moderately strong
            "channel": random.choice([1, 6, 11]),
            "authentication": "Open",
            "encryption": "None",
        }

    @classmethod
    def _make_neighbors(cls, count: int = 2) -> list[dict]:
        """Generate weak neighbor networks (background noise)."""
        chosen = random.sample(cls._NEIGHBOR_SSIDS, k=min(count, len(cls._NEIGHBOR_SSIDS)))
        neighbors: list[dict] = []
        for ssid in chosen:
            neighbors.append({
                "ssid": ssid,
                "bssid": cls._random_bssid(),
                "signal": random.randint(-95, -80),
                "channel": random.choice([1, 6, 11, 36, 44, 149]),
                "authentication": "WPA2-Personal",
                "encryption": "CCMP",
            })
        return neighbors

    @staticmethod
    def _random_bssid() -> str:
        """Generate a random MAC address string (uppercase, colon-separated)."""
        octets = [random.randint(0x00, 0xFF) for _ in range(6)]
        return ":".join(f"{b:02X}" for b in octets)
