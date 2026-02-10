"""
Controller Metrics Simulator
Pushes dynamic metrics through the HTTP API every few seconds.
Run:  python simulate_controllers.py
Stop: Ctrl+C
"""
import time, random, requests

API_BASE = 'http://localhost:8000/api/auth'
INTERVAL = 5  # seconds between updates

# Admin credentials to authenticate API calls
USERNAME = 'admin'
PASSWORD = 'admin'

def random_metrics():
    cpu = random.randint(5, 95)
    ram = random.randint(10, 90)
    temp = random.randint(35, 85)
    used_gb = random.randint(5, 80)
    total_gb = random.choice([100, 200, 500])
    days = random.randint(0, 30)
    hours = random.randint(0, 23)
    voltage = random.choice(['Normal', 'Normal', 'Normal', 'Low', 'Critical'])

    return {
        'cpu_usage': '%d%%' % cpu,
        'ram_usage': '%d%%' % ram,
        'cpu_temperature': '%d C' % temp,
        'storage_usage': '%d GB / %d GB' % (used_gb, total_gb),
        'system_uptime': '%dd %dh' % (days, hours),
        'voltage_power_status': voltage,
    }

# Create a session to persist cookies (CSRF + session auth)
session = requests.Session()

# Login
print('Logging in as %s...' % USERNAME)
session.get('%s/me/' % API_BASE)  # hit any endpoint to get csrftoken cookie
csrf = session.cookies.get('csrftoken', '')
login_resp = session.post('%s/login/' % API_BASE, json={'username': USERNAME, 'password': PASSWORD}, headers={'X-CSRFToken': csrf})
if login_resp.status_code != 200:
    print('Login failed: %s' % login_resp.text)
    exit(1)
print('Logged in.\n')

# Fetch controllers
def fetch_controllers():
    csrf = session.cookies.get('csrftoken', '')
    resp = session.get('%s/controllers/' % API_BASE, headers={'X-CSRFToken': csrf})
    resp.raise_for_status()
    return resp.json()

# Update a controller via PUT
def update_controller(ctl_id, data):
    csrf = session.cookies.get('csrftoken', '')
    resp = session.put('%s/controllers/%d/' % (API_BASE, ctl_id), json=data, headers={'X-CSRFToken': csrf})
    resp.raise_for_status()
    return resp.json()

print('Simulating controller metrics every %ds via API  (Ctrl+C to stop)\n' % INTERVAL)

try:
    while True:
        controllers = fetch_controllers()
        if not controllers:
            print('No controllers found. Create some from the dashboard first.')
            time.sleep(INTERVAL)
            continue

        for ctl in controllers:
            metrics = random_metrics()
            payload = {'name': ctl['name'], 'ip_address': ctl['ip_address'], **metrics}
            update_controller(ctl['id'], payload)
            print('[%s] %s  CPU=%s  RAM=%s  Temp=%s  Storage=%s  Uptime=%s  Power=%s' % (
                time.strftime('%H:%M:%S'), ctl['name'],
                metrics['cpu_usage'], metrics['ram_usage'],
                metrics['cpu_temperature'], metrics['storage_usage'],
                metrics['system_uptime'], metrics['voltage_power_status'],
            ))
        print('')
        time.sleep(INTERVAL)
except KeyboardInterrupt:
    print('\nStopped.')
