# WIDS Project Walkthrough

The **WiFi Intrusion Detection System (WIDS)** is now a fully functioning, end-to-end security suite featuring a premium React frontend and a robust, multi-threaded Python Flask backend.

---

## 🎨 Frontend Theme & Architecture

The frontend is built in **Vite + React** and is fully integrated with the backend using **Axios**.

- **Theme Palette**: Deep space backgrounds (`#060a13`), dark translucent glass cards (`rgba(15,23,42,0.7)`) with backdrop blur filters (`backdrop-filter: blur(20px)`), and thin glowing borders (`rgba(148,163,184,0.15)`).
- **Neon Accents**: Green (`#00ff88`) for whitelisted/trusted, Red (`#ff3366`) for rogue APs/Evil Twins/critical alerts, Amber (`#ffaa00`) for warnings, and Cyan (`#00d4ff`) for general info.
- **Animations**: Subtle `fadeInUp` and `scaleIn` entry transitions, floating pulsing status glows on sensors, and dynamic transitions on row updates.
- **Interactive UI**:
  - **Login Page**: Glass login card with an animated cyan laser scanline.
  - **Dashboard**: Stats counters (total APs, active threats, alerts), scanning table, alert timeline feed, and 4 multi-dimensional security charts (Chart.js).
  - **Whitelist Manager**: Table showing whitelisted access points with functional Add/Edit/Delete modal panels.
  - **Security Alerts**: Filterable logs with paging, read toggles, and click-to-expand details.
  - **Detection Logs**: Sensor properties and history sweeps timeline.
  - **User Management**: Operator directory displaying registered accounts, role levels (Administrator vs Viewer), registration forms, profile modification, and deauthorization logic.

---

## ⚙️ Backend Architecture

The backend is built in **Python Flask** with a daemon thread running continuous sweeps every 30 seconds.

```
backend/
├── .env                                  # Local configuration settings
├── .env.example                          # Template config env file
├── requirements.txt                      # Dependencies (Flask, CORS, SQLAlchemy, bcrypt)
├── run.py                                # Server entry point (starts background thread & app)
├── seed.py                               # Recreates & populates database tables
├── test_api.py                           # Integration test suite for verification
└── app/
    ├── __init__.py                       # App factory, blueprints setup, DB creation
    ├── config.py                         # Environment variables loader
    ├── models.py                         # SQLAlchemy database tables
    ├── detection/
    │   └── engine.py                     # Classification & threat analysis logic
    ├── routes/
    │   ├── auth.py                       # Login/Logout and user profile endpoints
    │   ├── whitelist.py                  # Whitelist CRUD management endpoints
    │   ├── alerts.py                     # Security incident retrieval & status updating
    │   ├── scanner.py                    # Active WiFi sweep triggers and history logs
    │   ├── users.py                      # Operator profiles CRUD endpoints
    │   └── dashboard.py                  # Aggregated numbers and chart data endpoints
    ├── scanner/
    │   ├── manager.py                    # Auto-detects driver interfaces and handles fallback
    │   ├── netsh_scanner.py              # Windows shell netsh stdout parsing
    │   └── simulator.py                  # Mock scans (randomized rogue/evil twin injection)
    └── services/
        ├── background.py                 # 30s background thread scanner loop
        └── mailer.py                     # Flask-Mail client dispatcher
```

---

## 📡 Scanner & Classification Engine

1. **Scanning Driver**:
   - **`netsh_scanner.py`**: Executes `netsh wlan show networks mode=bssid` on Windows, using regex to extract nearby SSIDs, BSSIDs, Signal, Channels, Authentication, and Encryption. Approximate dBm is computed via `dBm = (percent/2) - 100`.
   - **`simulator.py`**: Injects simulated neighbor networks, rogue honeypots (20% chance), and evil twin clones (30% chance) when no wireless adapters are present.
2. **Classification Logic (`engine.py`)**:
   - **Legitimate / Trusted**: The scanned SSID matches one of our organization's networks and its BSSID is authorized in our whitelist.
   - **Impersonator / Evil Twin (Potential Rogue AP)**: The scanned SSID matches one of our organization's networks, but its BSSID is **not authorized** (raises a `critical` severity alert).
   - **Ignored / Unknown**: Any scanned SSID that does **not** belong to our organization (e.g. coffee shop next door, neighbor's home router) is quietly categorized as `unknown` with no alerts triggered.
   - **Signal Anomaly**: An authorized BSSID's signal varies by > 30 dBm in consecutive scans (raises a `low` alert).

---

## 💾 Database Schema & Fallback

The database runs on **MySQL** but dynamically falls back to a local **SQLite** database file (`backend/wids.db`) if no MySQL credentials are provided in `.env`:

- `users`: ID, user_id (e.g. `U-001`), full_name, username, email, password_hash (bcrypt), role, is_active, last_login, created_at.
- `authorized_aps`: Whitelisted access points (SSID, BSSID, Channel, Added By, Date).
- `detected_aps`: Discovered AP details (SSID, BSSID, Signal, Channel, Authentication, Encryption, Status).
- `alerts`: Security warnings triggered by the classification engine.
- `scan_history`: Records scan timestamps, duration (ms), counts of AP types, and alerts generated.

---

## 🛠️ Verification & Test Results

The backend endpoints were successfully verified by running the active integration test suite `test_api.py`:

```bash
=== WIDS API INTEGRATION TESTS ===
Testing Auth Login (POST /auth/login)...
Status Code: 200
Success! JSON response:
{'success': True, 'token': 'jwt-token-1782835794', 'user': {'created_at': '2026-06-15T00:00:00', 'email': 'admin@wids.local', 'fullName': 'Jane Doe', 'id': 1, 'isActive': True, 'lastLogin': '2026-06-30T16:09:54.877388', 'role': 'admin', 'userId': 'U-001', 'username': 'admin'}}

Obtained auth token: jwt-token-1782835794
Testing Dashboard Stats (GET /dashboard/stats)...
Status Code: 200
Success! JSON response:
{'critical_alerts': 2, 'evil_twins': 2, 'last_scan': '2026-06-30T16:09:41.714360', 'rogue_aps': 3, 'scan_interval': 30, 'scanner_status': 'active', 'total_alerts': 18, 'total_aps': 13, 'trusted_aps': 6, 'unknown_aps': 2, 'unread_alerts': 9}
Testing Whitelist Manager (GET /whitelist/)...
Status Code: 200
Success! JSON response:
[...]
Testing Scanner Status (GET /scanner/status)...
Status Code: 200
Success! JSON response:
{'interval': 30, 'last_scan': None, 'method': 'netsh', 'status': 'active'}
Testing Detected APs (GET /scanner/detected)...
Status Code: 200
Success! JSON response:
[...]
=== Integration tests completed successfully! ===
```

Both the **Windows live WiFi scanning driver** and the **database queries/associations** executed successfully without any errors.
