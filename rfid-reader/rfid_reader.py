import serial
import time
import requests
from datetime import datetime
import json

# Konfigurasi Firebase
FIREBASE_URL = "https://e-perpus-13f02-default-rtdb.firebaseio.com"
API_KEY = "AIzaSyB1HKFjB7AZFLZ-P-iixMd9SdGA5njXN4c"

# Konfigurasi Serial (ubah COM/USB sesuai perangkatmu)
ser = serial.Serial('/dev/ttyUSB0', 9600, timeout=1)
ser.flush()

def send_rfid_to_firebase(uid):
    """Mengirim UID ke Firebase"""
    url = f"{FIREBASE_URL}/current_rfid.json?auth={API_KEY}"
    data = {
        "uid": uid,
        "timestamp": datetime.now().isoformat(),
        "status": "pending"
    }
    try:
        response = requests.put(url, data=json.dumps(data))
        print(f"✅ UID {uid} terkirim: {response.status_code}")
    except Exception as e:
        print(f"❌ Error kirim UID: {e}")

def main():
    print("🟢 RFID Reader aktif. Tap kartu...")
    last_uid = None
    last_sent_time = 0

    while True:
        if ser.in_waiting > 0:
            uid = ser.readline().decode('utf-8').strip()
            if uid and len(uid) >= 8 and uid != last_uid and (time.time() - last_sent_time > 2):
                print(f"🔍 UID Terdeteksi: {uid}")
                last_uid = uid
                last_sent_time = time.time()
                send_rfid_to_firebase(uid)
        time.sleep(0.1)

if __name__ == "__main__":
    main()
