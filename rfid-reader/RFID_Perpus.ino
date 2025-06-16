
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "time.h"

// WiFi
#define WIFI_SSID "Redmi Note 10 5G"
#define WIFI_PASSWORD "12345678"

// Firebase
#define API_KEY "AIzaSyB1HKFjB7AZFLZ-P-iixMd9SdGA5njXN4c"
#define DATABASE_URL "https://e-perpus-13f02-default-rtdb.firebaseio.com/"
#define USER_EMAIL "thisbrandon776@gmail.com"
#define USER_PASSWORD "thomasbrandon25"

// Komponen
#define SS_PIN 4
#define RST_PIN 15
#define BUZZER_PIN 32

MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
FirebaseJson json;

const char* ntpServer = "pool.ntp.org";
unsigned long timestamp;
String lastUID = "";
unsigned long lastScanTime = 0;

void initWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Menghubungkan WiFi");
  lcd.setCursor(1, 0);
  lcd.print("MENGHUBUNGKAN");
  lcd.setCursor(6, 1);
  lcd.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nWiFi Terhubung!");
  lcd.clear();
  lcd.setCursor(0, 1);
  lcd.print("WiFi  Terhubung!");
  delay(1000);
  lcd.clear();
}

unsigned long getTime() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return 0;
  }
  time(&now);
  return now;
}

String readRFID() {
  while (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(100);
  }

  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uid += (rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  return uid;
}

void kirimKeFirebase(String id_kartu) {
  // Cek apakah UID sama dengan scan sebelumnya dan masih dalam interval waktu
  unsigned long currentTime = millis();
  if (id_kartu == lastUID && (currentTime - lastScanTime) < 3000) {
    Serial.println("Duplicate scan ignored");
    return;
  }
  
  lastUID = id_kartu;
  lastScanTime = currentTime;
  
  timestamp = getTime();
  
  // Kirim ke current_rfid untuk real-time detection
  String currentRfidPath = "/current_rfid";
  json.clear();
  json.set("uid", id_kartu);
  json.set("timestamp", String(timestamp));
  json.set("status", "scanned");
  
  if (Firebase.RTDB.setJSON(&fbdo, currentRfidPath.c_str(), &json)) {
    Serial.println("Data terkirim ke current_rfid");
  } else {
    Serial.print("Gagal mengirim ke current_rfid: ");
    Serial.println(fbdo.errorReason());
  }
  
  // Kirim ke Userdata untuk logging
  String userdataPath = "/Userdata/" + id_kartu + "/readings";
  String readingId = String(timestamp);
  
  json.clear();
  json.set("id_kartu", id_kartu);
  json.set("waktu_scan", String(timestamp));
  json.set("status", "active");
  
  if (Firebase.RTDB.setJSON(&fbdo, (userdataPath + "/" + readingId).c_str(), &json)) {
    Serial.println("Data terkirim ke Userdata");
  } else {
    Serial.print("Gagal mengirim ke Userdata: ");
    Serial.println(fbdo.errorReason());
  }
  
  // Update rfid_logs untuk history
  String logPath = "/rfid_logs";
  String logId = id_kartu + "_" + String(timestamp);
  
  json.clear();  
  json.set("uid", id_kartu);
  json.set("timestamp", String(timestamp));
  json.set("action", "card_scanned");
  json.set("device", "ESP32_RFID_Reader");
  
  Firebase.RTDB.setJSON(&fbdo, (logPath + "/" + logId).c_str(), &json);
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();
  lcd.init();
  lcd.backlight();
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  initWiFi();
  configTime(25200, 0, ntpServer); // UTC+7 untuk WIB

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  config.max_token_generation_retry = 5;

  Firebase.reconnectWiFi(true);
  Firebase.begin(&config, &auth);

  Serial.println("Menunggu autentikasi Firebase...");
  lcd.setCursor(0, 0);
  lcd.print("FIREBASE");
  lcd.setCursor(0, 1);
  lcd.print("CONNECTING...");
  
  while ((auth.token.uid) == "") {
    Serial.print(".");
    delay(1000);
  }
  Serial.println("\nFirebase Siap!");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SISTEM SIAP");
  lcd.setCursor(0, 1);
  lcd.print("TAP KARTU RFID");
  delay(2000);
}

void loop() {
  // Tampilkan status ready
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("TEMPELKAN  KARTU");
  lcd.setCursor(2, 1);
  lcd.print("PADA READER");

  String id_kartu = readRFID();
  Serial.print("UID Kartu: ");
  Serial.println(id_kartu);

  // Tampilkan UID yang terbaca
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("KARTU TERBACA:");
  lcd.setCursor(0, 1);
  if (id_kartu.length() > 16) {
    lcd.print(id_kartu.substring(0, 16));
  } else {
    lcd.print(id_kartu);
  }
  
  // Suara buzzer
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  delay(100);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  
  delay(1500);

  // Kirim ke Firebase
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("MENGIRIM DATA...");
  kirimKeFirebase(id_kartu);
  
  lcd.setCursor(0, 1);
  lcd.print("DATA TERKIRIM!");
  delay(2000);
  
  // Delay sebelum scan berikutnya
  delay(1000);
}
