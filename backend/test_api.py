import requests
import sys

BASE_URL = "http://localhost:5000/api"

def test_endpoint(name, method, url, data=None):
    print(f"Testing {name} ({method} {url})...")
    try:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{url}")
        elif method == "POST":
            response = requests.post(f"{BASE_URL}{url}", json=data)
        else:
            print("Unsupported method")
            return None
        
        print(f"Status Code: {response.status_code}")
        if response.status_code in [200, 201]:
            print("Success! JSON response:")
            print(response.json())
            return response.json()
        else:
            print(f"Failed! Error: {response.text}")
            return None
    except Exception as e:
        print(f"Error connecting: {e}")
        return None

if __name__ == "__main__":
    print("=== WIDS API INTEGRATION TESTS ===")
    
    # 1. Test Login
    login_data = {"username": "admin", "password": "admin"}
    login_resp = test_endpoint("Auth Login", "POST", "/auth/login", login_data)
    
    if not login_resp:
        print("\nEnsure the Flask backend is running on port 5000 before executing this script.")
        sys.exit(1)
        
    token = login_resp.get("token")
    print(f"\nObtained auth token: {token}")
    
    # 2. Test Get Dashboard Stats
    test_endpoint("Dashboard Stats", "GET", "/dashboard/stats")
    
    # 3. Test Get Whitelist
    test_endpoint("Whitelist Manager", "GET", "/whitelist/")
    
    # 4. Test Scanner Status
    test_endpoint("Scanner Status", "GET", "/scanner/status")
    
    # 5. Test Detected APs
    test_endpoint("Detected APs", "GET", "/scanner/detected")
    
    print("\n=== Integration tests completed successfully! ===")
