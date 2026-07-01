from app import create_app, db
from app.models import DetectedAP, Alert, ScanHistory

app = create_app()

with app.app_context():
    detected_aps = DetectedAP.query.all()
    alerts = Alert.query.all()
    history = ScanHistory.query.all()

    print(f"Total Detected APs: {len(detected_aps)}")
    print(f"Total Alerts: {len(alerts)}")
    print(f"Total Scan History Records: {len(history)}")
    
    print("\n--- Detected APs ---")
    for ap in detected_aps:
        print(f"BSSID: {ap.bssid}, SSID: '{ap.ssid}', Signal: {ap.signal}, Status: {ap.status}")
        
    print("\n--- Scan History ---")
    for h in history:
        print(f"Scan Time: {h.scan_time}, Total APs: {h.total_aps}, Trusted: {h.trusted}, Rogue: {h.rogue}, Evil Twin: {h.evil_twin}, Unknown: {h.unknown}, Method: {h.scan_method}")
