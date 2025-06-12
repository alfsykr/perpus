import serial
import time
import requests
from datetime import datetime
import json

# Konfigurasi Firebase
FIREBASE_URL = "https://e-perpus-13f02-default-rtdb.firebaseio.com"
API_KEY = "AIzaSyB1HKFjB7AZFLZ-P-iixMd9SdGA5njXN4c"

# Konfigurasi Serial (sesuaikan dengan port Anda)
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
        print(f"UID {uid} terkirim: {response.status_code}")
    except Exception as e:
        print(f"Error mengirim UID: {e}")

def main():
    print("RFID Reader siap...")
    last_uid = None
    
    while True:
        if ser.in_waiting > 0:
            # Baca UID dari serial
            uid = ser.readline().decode('utf-8').strip()
            
            # Pastikan UID valid dan berbeda dari sebelumnya
            if uid and len(uid) >= 8 and uid != last_uid:
                print(f"UID terdeteksi: {uid}")
                last_uid = uid
                send_rfid_to_firebase(uid)
        
        time.sleep(0.1)

if __name__ == "__main__":
    main()