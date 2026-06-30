"""
Database seeder for the WiFi Intrusion Detection System.

Usage:
    python seed.py

WARNING: This drops ALL existing tables before re-creating them.
Only use in a development environment.
"""

from datetime import datetime

from app import create_app, db
from app.models import User, AuthorizedAP, DetectedAP, Alert, ScanHistory


def seed() -> None:
    """Drop, recreate, and populate all tables with sample data."""

    app = create_app()

    with app.app_context():
        # ── Reset database ──────────────────────────────────────────────
        print('[seed] Dropping all tables …')
        db.drop_all()
        print('[seed] Creating all tables …')
        db.create_all()

        # ────────────────────────────────────────────────────────────────
        # USERS
        # ────────────────────────────────────────────────────────────────
        users = [
            User(
                id=1,
                user_id='U-001',
                full_name='Jane Doe',
                username='admin',
                email='admin@wids.local',
                role='admin',
                is_active=True,
                last_login=datetime(2026, 6, 30, 10, 30, 0),
                created_at=datetime(2026, 6, 15),
            ),
            User(
                id=2,
                user_id='U-002',
                full_name='John Smith',
                username='jsmith',
                email='jsmith@wids.local',
                role='viewer',
                is_active=True,
                last_login=datetime(2026, 6, 30, 8, 15, 0),
                created_at=datetime(2026, 6, 16),
            ),
            User(
                id=3,
                user_id='U-003',
                full_name='Alice Johnson',
                username='alicej',
                email='ajohnson@wids.local',
                role='admin',
                is_active=False,
                last_login=datetime(2026, 6, 25, 14, 45, 0),
                created_at=datetime(2026, 6, 18),
            ),
            User(
                id=4,
                user_id='U-004',
                full_name='Bob Wilson',
                username='bobw',
                email='bwilson@wids.local',
                role='viewer',
                is_active=False,
                last_login=None,
                created_at=datetime(2026, 6, 28),
            ),
        ]

        # Set passwords
        users[0].set_password('admin')      # admin user
        users[1].set_password('password')   # viewer
        users[2].set_password('password')   # admin (inactive)
        users[3].set_password('password')   # viewer (inactive)

        db.session.add_all(users)
        db.session.commit()
        print(f'[seed] Users: {len(users)} rows inserted.')

        # ────────────────────────────────────────────────────────────────
        # AUTHORIZED APs (whitelist)
        # ────────────────────────────────────────────────────────────────
        authorized_aps = [
            AuthorizedAP(ssid='HomeNetwork_5G',  bssid='A4:CF:12:D3:45:67', channel=36, added_by='admin'),
            AuthorizedAP(ssid='HomeNetwork_2G',  bssid='A4:CF:12:D3:45:68', channel=6,  added_by='admin'),
            AuthorizedAP(ssid='SchoolWiFi',      bssid='00:1A:2B:3C:4D:5E', channel=1,  added_by='admin'),
            AuthorizedAP(ssid='SchoolWiFi',      bssid='00:1A:2B:3C:4D:5F', channel=11, added_by='admin'),
            AuthorizedAP(ssid='LabNetwork',      bssid='B8:27:EB:12:34:56', channel=44, added_by='admin'),
            AuthorizedAP(ssid='OfficeGuest',     bssid='DC:A6:32:AA:BB:CC', channel=6,  added_by='admin'),
        ]

        db.session.add_all(authorized_aps)
        db.session.commit()
        print(f'[seed] AuthorizedAPs: {len(authorized_aps)} rows inserted.')

        # ────────────────────────────────────────────────────────────────
        # DETECTED APs (mock scan results)
        # ────────────────────────────────────────────────────────────────
        detected_aps = [
            DetectedAP(
                id=1, ssid='HomeNetwork_5G', bssid='A4:CF:12:D3:45:67',
                signal=-42, channel=36, status='trusted',
                authentication='WPA2-PSK', encryption='AES',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=2, ssid='HomeNetwork_2G', bssid='A4:CF:12:D3:45:68',
                signal=-55, channel=6, status='trusted',
                authentication='WPA2-PSK', encryption='AES',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=3, ssid='SchoolWiFi', bssid='00:1A:2B:3C:4D:5E',
                signal=-48, channel=1, status='trusted',
                authentication='WPA2-Enterprise', encryption='AES',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=4, ssid='SchoolWiFi', bssid='00:1A:2B:3C:4D:5F',
                signal=-61, channel=11, status='trusted',
                authentication='WPA2-Enterprise', encryption='AES',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=5, ssid='FreeWiFi', bssid='DE:AD:BE:EF:00:01',
                signal=-35, channel=6, status='rogue',
                authentication='Open', encryption='None',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=6, ssid='HomeNetwork_5G', bssid='AA:BB:CC:DD:EE:FF',
                signal=-38, channel=36, status='evil_twin',
                authentication='WPA2-PSK', encryption='AES',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=7, ssid='LabNetwork', bssid='B8:27:EB:12:34:56',
                signal=-52, channel=44, status='trusted',
                authentication='WPA3-SAE', encryption='AES',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=8, ssid='SuspiciousNet', bssid='11:22:33:44:55:66',
                signal=-70, channel=3, status='rogue',
                authentication='WPA-PSK', encryption='TKIP',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=9, ssid='SchoolWiFi', bssid='FF:EE:DD:CC:BB:AA',
                signal=-30, channel=1, status='evil_twin',
                authentication='Open', encryption='None',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=10, ssid='OfficeGuest', bssid='DC:A6:32:AA:BB:CC',
                signal=-58, channel=6, status='trusted',
                authentication='WPA2-PSK', encryption='AES',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=11, ssid='Unknown_Net', bssid='77:88:99:AA:BB:CC',
                signal=-75, channel=9, status='unknown',
                authentication='WPA2-PSK', encryption='AES',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            DetectedAP(
                id=12, ssid='HiddenNetwork', bssid='00:11:22:33:44:55',
                signal=-80, channel=11, status='unknown',
                authentication='WPA2-PSK', encryption='AES',
                scanned_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
        ]

        db.session.add_all(detected_aps)
        db.session.commit()
        print(f'[seed] DetectedAPs: {len(detected_aps)} rows inserted.')

        # ────────────────────────────────────────────────────────────────
        # ALERTS
        # ────────────────────────────────────────────────────────────────
        alerts = [
            Alert(
                id=1, alert_type='rogue_ap', detected_ap_id=5, severity='high',
                is_read=False, ssid='FreeWiFi', bssid='DE:AD:BE:EF:00:01',
                description='Unauthorized open access point detected with no encryption. '
                            'This AP is not in the whitelist and may be used for traffic interception.',
                created_at=datetime(2026, 6, 30, 14, 30, 0),
            ),
            Alert(
                id=2, alert_type='evil_twin', detected_ap_id=6, severity='critical',
                is_read=False, ssid='HomeNetwork_5G', bssid='AA:BB:CC:DD:EE:FF',
                description='Evil twin detected! An AP is impersonating "HomeNetwork_5G" with a '
                            'different BSSID. The signal is stronger than the legitimate AP, '
                            'suggesting proximity-based attack.',
                created_at=datetime(2026, 6, 30, 14, 28, 0),
            ),
            Alert(
                id=3, alert_type='evil_twin', detected_ap_id=9, severity='critical',
                is_read=False, ssid='SchoolWiFi', bssid='FF:EE:DD:CC:BB:AA',
                description='Evil twin detected for "SchoolWiFi"! Unauthorized AP mimicking the '
                            'school network with no encryption (original uses WPA2-Enterprise).',
                created_at=datetime(2026, 6, 30, 14, 25, 0),
            ),
            Alert(
                id=4, alert_type='rogue_ap', detected_ap_id=8, severity='medium',
                is_read=True, ssid='SuspiciousNet', bssid='11:22:33:44:55:66',
                description='Unknown access point detected using outdated TKIP encryption. '
                            'Not in whitelist.',
                created_at=datetime(2026, 6, 30, 13, 0, 0),
            ),
            Alert(
                id=5, alert_type='signal_anomaly', detected_ap_id=1, severity='low',
                is_read=True, ssid='HomeNetwork_5G', bssid='A4:CF:12:D3:45:67',
                description='Signal strength fluctuation detected on trusted AP "HomeNetwork_5G". '
                            'Signal varied by more than 15 dBm in the last 5 minutes.',
                created_at=datetime(2026, 6, 30, 12, 45, 0),
            ),
            Alert(
                id=6, alert_type='rogue_ap', detected_ap_id=5, severity='high',
                is_read=True, ssid='FreeWiFi', bssid='DE:AD:BE:EF:00:01',
                description='Recurring rogue AP "FreeWiFi" detected again. '
                            'This AP has been flagged multiple times.',
                created_at=datetime(2026, 6, 29, 16, 20, 0),
            ),
            Alert(
                id=7, alert_type='signal_anomaly', detected_ap_id=3, severity='low',
                is_read=True, ssid='SchoolWiFi', bssid='00:1A:2B:3C:4D:5E',
                description='Minor signal anomaly on "SchoolWiFi". Signal dropped briefly below threshold.',
                created_at=datetime(2026, 6, 29, 10, 15, 0),
            ),
            Alert(
                id=8, alert_type='evil_twin', detected_ap_id=6, severity='critical',
                is_read=True, ssid='HomeNetwork_5G', bssid='AA:BB:CC:DD:EE:FF',
                description='Repeated evil twin attack on "HomeNetwork_5G". '
                            'Same rogue BSSID detected in previous scan.',
                created_at=datetime(2026, 6, 29, 9, 0, 0),
            ),
            Alert(
                id=9, alert_type='rogue_ap', detected_ap_id=8, severity='medium',
                is_read=True, ssid='SuspiciousNet', bssid='11:22:33:44:55:66',
                description='Rogue AP "SuspiciousNet" detected with weak TKIP encryption.',
                created_at=datetime(2026, 6, 28, 22, 30, 0),
            ),
            Alert(
                id=10, alert_type='signal_anomaly', detected_ap_id=2, severity='low',
                is_read=True, ssid='HomeNetwork_2G', bssid='A4:CF:12:D3:45:68',
                description='Signal anomaly on "HomeNetwork_2G". Brief interference detected.',
                created_at=datetime(2026, 6, 28, 15, 0, 0),
            ),
            Alert(
                id=11, alert_type='rogue_ap', detected_ap_id=5, severity='high',
                is_read=True, ssid='FreeWiFi', bssid='DE:AD:BE:EF:00:01',
                description='Open rogue AP "FreeWiFi" reappeared after being absent for 2 hours.',
                created_at=datetime(2026, 6, 28, 11, 45, 0),
            ),
            Alert(
                id=12, alert_type='evil_twin', detected_ap_id=9, severity='critical',
                is_read=True, ssid='SchoolWiFi', bssid='FF:EE:DD:CC:BB:AA',
                description='Evil twin for "SchoolWiFi" detected during school hours. '
                            'Immediate action recommended.',
                created_at=datetime(2026, 6, 27, 8, 30, 0),
            ),
        ]

        db.session.add_all(alerts)
        db.session.commit()
        print(f'[seed] Alerts: {len(alerts)} rows inserted.')

        # ────────────────────────────────────────────────────────────────
        # SCAN HISTORY
        # ────────────────────────────────────────────────────────────────
        scan_history = [
            ScanHistory(
                id=1, scan_time=datetime(2026, 6, 30, 14, 30, 0),
                total_aps=12, trusted=6, rogue=2, evil_twin=2, unknown=2,
                alerts_generated=3, scan_method='simulation', duration_ms=1250,
            ),
            ScanHistory(
                id=2, scan_time=datetime(2026, 6, 30, 14, 0, 0),
                total_aps=10, trusted=6, rogue=2, evil_twin=1, unknown=1,
                alerts_generated=2, scan_method='simulation', duration_ms=1100,
            ),
            ScanHistory(
                id=3, scan_time=datetime(2026, 6, 30, 13, 30, 0),
                total_aps=11, trusted=6, rogue=2, evil_twin=2, unknown=1,
                alerts_generated=1, scan_method='simulation', duration_ms=1180,
            ),
            ScanHistory(
                id=4, scan_time=datetime(2026, 6, 30, 13, 0, 0),
                total_aps=9, trusted=5, rogue=2, evil_twin=1, unknown=1,
                alerts_generated=1, scan_method='simulation', duration_ms=980,
            ),
            ScanHistory(
                id=5, scan_time=datetime(2026, 6, 30, 12, 30, 0),
                total_aps=10, trusted=6, rogue=1, evil_twin=2, unknown=1,
                alerts_generated=2, scan_method='simulation', duration_ms=1050,
            ),
            ScanHistory(
                id=6, scan_time=datetime(2026, 6, 30, 12, 0, 0),
                total_aps=8, trusted=5, rogue=1, evil_twin=1, unknown=1,
                alerts_generated=0, scan_method='simulation', duration_ms=920,
            ),
            ScanHistory(
                id=7, scan_time=datetime(2026, 6, 30, 11, 30, 0),
                total_aps=9, trusted=6, rogue=1, evil_twin=1, unknown=1,
                alerts_generated=1, scan_method='simulation', duration_ms=1020,
            ),
            ScanHistory(
                id=8, scan_time=datetime(2026, 6, 30, 11, 0, 0),
                total_aps=7, trusted=5, rogue=1, evil_twin=0, unknown=1,
                alerts_generated=1, scan_method='simulation', duration_ms=850,
            ),
        ]

        db.session.add_all(scan_history)
        db.session.commit()
        print(f'[seed] ScanHistory: {len(scan_history)} rows inserted.')

        print('\n[seed] DB Seeding Completed successfully!')


if __name__ == '__main__':
    seed()
