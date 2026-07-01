from app.scanner.netsh_scanner import NetshScanner

scanner = NetshScanner()
output = scanner._run_netsh()
networks = scanner._parse_output(output)

print(f"Total raw lines: {len(output.splitlines())}")
print(f"Total parsed networks: {len(networks)}")
print("\nParsed networks:")
for idx, net in enumerate(networks):
    print(f"{idx+1}. SSID: '{net['ssid']}', BSSID: '{net['bssid']}', Signal: {net['signal']} dBm, Channel: {net['channel']}, Auth: '{net['authentication']}', Enc: '{net['encryption']}'")
