import RPi.GPIO as GPIO
import time

# GPIO pin numbers (BCM mode)
STOP_BUTTON = 17
HINT_BUTTON = 27

GPIO.setmode(GPIO.BCM)

# Setup buttons with internal pull-up resistors
GPIO.setup(STOP_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(HINT_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)

print("Waiting for button press...")

try:
    while True:
        if GPIO.input(STOP_BUTTON) == GPIO.LOW:
            print("🛑 Stop button pressed")
            time.sleep(0.3)  # debounce

        if GPIO.input(HINT_BUTTON) == GPIO.LOW:
            print("ðŸ’¡ Hint button pressed")
            time.sleep(0.3)  # debounce

except KeyboardInterrupt:
    print("\nExiting...")

finally:
    GPIO.cleanup()