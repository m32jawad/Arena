from gpiozero import OutputDevice
from time import sleep
import threading
import sys

# ---------- RELAY GPIOs (BCM) ----------
GAME_ACTIVE = 5
RESET_RELAY = 6
READY_RELAY = 13

# LOW-level triggered relay modules
game_active = OutputDevice(GAME_ACTIVE, active_high=False, initial_value=False)
reset_relay = OutputDevice(RESET_RELAY, active_high=False, initial_value=False)
ready_relay = OutputDevice(READY_RELAY, active_high=False, initial_value=False)

relays = [
    (game_active, "GAME ACTIVE"),
    (reset_relay, "RESET"),
    (ready_relay, "READY"),
]

running = True  # global flag


# ---------- EXIT LISTENER ----------
def listen_for_exit():
    global running
    while True:
        cmd = sys.stdin.readline().strip().lower()
        if cmd == "q":
            print("\nðŸ›‘ Exit command received (q)")
            running = False
            break


# ---------- RELAY PULSE ----------
def pulse(relay, name, duration=2):
    print(f"{name} ON")
    relay.on()
    sleep(duration)
    relay.off()
    print(f"{name} OFF")
    sleep(0.5)


# ---------- MAIN ----------
print("âœ… All relays OFF at startup")
print("âŒ¨ï¸  Type 'q' + Enter to exit\n")

# Start keyboard listener thread
threading.Thread(target=listen_for_exit, daemon=True).start()

try:
    while running:
        for relay, name in relays:
            if not running:
                break
            pulse(relay, name, 2)

except KeyboardInterrupt:
    print("\nðŸ›‘ Ctrl+C pressed")

finally:
    print("ðŸ”Œ Turning all relays OFF and exiting")
    for relay, _ in relays:
        relay.off()