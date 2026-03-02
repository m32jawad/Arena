import psutil
import subprocess
import socket
import time
from datetime import timedelta


def cmd(command):
    return subprocess.check_output(command, shell=True).decode().strip()


def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "N/A"


def status():
    print("\n" + "=" * 40)
    print("ðŸŸ¢ Raspberry Pi System Status")
    print("=" * 40)

    # CPU
    cpu_temp = cmd("vcgencmd measure_temp").replace("temp=", "")
    cpu_freq = cmd("vcgencmd measure_clock arm").split("=")[1]
    cpu_freq = f"{int(cpu_freq)//1000000} MHz"
    cpu_usage = psutil.cpu_percent(interval=1)
    cores = psutil.cpu_percent(interval=0, percpu=True)

    print(f"ðŸŒ¡ CPU Temp     : {cpu_temp}")
    print(f"âš™ CPU Freq     : {cpu_freq}")
    print(f"ðŸ§  CPU Usage   : {cpu_usage}%")
    for i, c in enumerate(cores):
        print(f"   â”” Core {i}: {c}%")

    # Memory
    mem = psutil.virtual_memory()
    print(f"ðŸ’¾ RAM Usage   : {mem.used//(1024**2)}MB / {mem.total//(1024**2)}MB ({mem.percent}%)")

    # Disk
    disk = psutil.disk_usage("/")
    print(f"ðŸ“€ Disk Usage  : {disk.used//(1024**3)}GB / {disk.total//(1024**3)}GB ({disk.percent}%)")

    # GPU temp
    gpu_temp = cmd("vcgencmd measure_temp").replace("temp=", "")
    print(f"ðŸ–¥ GPU Temp    : {gpu_temp}")

    # Throttling
    throttle = cmd("vcgencmd get_throttled")
    print(f"âš¡ Throttled   : {throttle}")

    # Uptime
    uptime = timedelta(seconds=int(time.time() - psutil.boot_time()))
    print(f"â± Uptime      : {uptime}")

    # Network
    print(f"ðŸŒ IP Address  : {get_ip()}")

    print("=" * 40)


try:
    while True:
        status()
        time.sleep(5)

except KeyboardInterrupt:
    print("\nðŸ›‘ Exiting system monitor")