from app import create_app, db
from app.models import AuthorizedAP, DetectedAP, Alert, ScanHistory
from app.detection.engine import DetectionEngine

app = create_app()

with app.app_context():
    # Clear tables first for test
    print("Resetting tables for unit test...")
    db.session.query(AuthorizedAP).delete()
    db.session.query(DetectedAP).delete()
    db.session.query(Alert).delete()
    db.session.query(ScanHistory).delete()
    db.session.commit()

    engine = DetectionEngine(db)

    # 1. Add our organization's SSID and BSSID to the whitelist
    my_ssid = "OrgCorporateWiFi"
    legit_bssid = "AA:BB:CC:DD:EE:11"
    
    print(f"1. Whitelisting organization AP: SSID={my_ssid}, BSSID={legit_bssid}")
    whitelist_entry = AuthorizedAP(ssid=my_ssid, bssid=legit_bssid, channel=6)
    db.session.add(whitelist_entry)
    db.session.commit()

    # 2. Simulate scan results containing:
    # - A neighbor network (SSID="CoffeeShopGuest", BSSID="11:22:33:44:55:66") -> Should be ignored / unknown
    # - Our legitimate network (SSID="OrgCorporateWiFi", BSSID="AA:BB:CC:DD:EE:11") -> Should be trusted
    # - An impersonator network (SSID="OrgCorporateWiFi", BSSID="FA:KE:FA:KE:00:99") -> Should be evil_twin (rogue)
    scan_results = [
        {
            "ssid": "CoffeeShopGuest",
            "bssid": "11:22:33:44:55:66",
            "signal": -45,
            "channel": 1,
            "authentication": "Open",
            "encryption": "None"
        },
        {
            "ssid": my_ssid,
            "bssid": legit_bssid,
            "signal": -50,
            "channel": 6,
            "authentication": "WPA2-Personal",
            "encryption": "CCMP"
        },
        {
            "ssid": my_ssid,
            "bssid": "FA:KE:FA:KE:00:99",
            "signal": -35,
            "channel": 6,
            "authentication": "WPA2-Personal",
            "encryption": "CCMP"
        }
    ]

    print("\n2. Processing simulated sweep...")
    summary = engine.process_scan(scan_results, "simulation")
    print(f"Scan Summary: {summary}")

    # 3. Check classifications in database
    print("\n3. Verifying classifications:")
    detected = DetectedAP.query.all()
    for ap in detected:
        print(f" - BSSID: {ap.bssid}, SSID: '{ap.ssid}', Status: {ap.status}")

    # 4. Check alerts generated
    alerts = Alert.query.all()
    print(f"\n4. Verifying alerts generated: {len(alerts)}")
    for alert in alerts:
        print(f" - Alert: Type={alert.alert_type}, Severity={alert.severity}, SSID='{alert.ssid}', Description='{alert.description}'")

    # Assert expected outcomes
    assert len(alerts) == 1, "Should generate exactly 1 threat alert for the impersonator AP!"
    assert alerts[0].alert_type == "evil_twin", "Alert should be of type 'evil_twin'!"
    print("\nUnit test passed successfully! Enterprise logic verified.")
