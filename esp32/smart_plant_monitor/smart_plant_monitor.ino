/**
 * Smart Plant Monitor - ESP32 (Sản phẩm thật)
 *
 * CN01  WiFi + MQTT
 * CN02  Cảm biến đất + DHT11 → MQTT → Web
 * CN03  Nhận lệnh bơm/quạt từ Web qua MQTT
 * CN04  Tự động hóa cục bộ: đất khô → bơm
 * CN07  Cảnh báo khẩn cấp → MQTT → Web
 * CN08  Nhận ngưỡng từ Web, lưu NVS
 * WiFi  WiFiManager - cấu hình WiFi qua portal (sản phẩm thật)
 *
 * Thư viện Arduino (Library Manager):
 * - PubSubClient
 * - DHT sensor library (Adafruit)
 * - Adafruit Unified Sensor
 * - LiquidCrystal I2C
 * - WiFiManager by tzapu
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>
#include "config.h"

#define DHT_TYPE DHT11

DHT dht(PIN_DHT, DHT_TYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);
WiFiManager wifiManager;
WiFiClient espClient;
PubSubClient mqtt(espClient);
Preferences prefs;

bool pumpOn = false;
bool fanOn = false;
bool autoMode = true;
int soilMin = DEFAULT_SOIL_MIN;
int tempMax = DEFAULT_TEMP_MAX;
int humidityMin = DEFAULT_HUMIDITY_MIN;

unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastLcdUpdate = 0;
unsigned long lastAutoCheck = 0;
unsigned long lastAlertTime = 0;
unsigned long btnPressStart = 0;

float lastSoil = 0;
float lastTemp = 0;
float lastHumid = 0;

// Khai báo trước
void setPump(bool on);
void setFan(bool on);
void parseThresholdConfig(String json);
void publishThresholdAck();
void publishAlert(const char* type, const char* message, const char* level);
void saveThresholds();
void loadThresholds();

// ===== WiFi Portal - cấu hình WiFi sản phẩm thật =====
bool shouldStartConfigPortal() {
  pinMode(PIN_CONFIG_BTN, INPUT_PULLUP);
  if (digitalRead(PIN_CONFIG_BTN) == LOW) {
    delay(50);
    if (digitalRead(PIN_CONFIG_BTN) == LOW) return true;
  }
  prefs.begin("wifi", true);
  bool forceConfig = prefs.getBool("forceConfig", false);
  prefs.end();
  return forceConfig;
}

void setupWiFi() {
  wifiManager.setConfigPortalTimeout(WIFI_CONFIG_TIMEOUT);
  wifiManager.setAPStaticIPConfig(IPAddress(192, 168, 4, 1), IPAddress(192, 168, 4, 1), IPAddress(255, 255, 255, 0));

  lcd.clear();
  lcd.print("Cau hinh WiFi");
  lcd.setCursor(0, 1);
  lcd.print("AP: SmartPlant");

  bool needPortal = shouldStartConfigPortal();

  if (needPortal) {
    lcd.clear();
    lcd.print("Vao che do setup");
    lcd.setCursor(0, 1);
    lcd.print(WIFI_AP_NAME);
    if (!wifiManager.startConfigPortal(WIFI_AP_NAME, WIFI_AP_PASSWORD)) {
      lcd.clear();
      lcd.print("Setup timeout!");
      delay(2000);
      ESP.restart();
    }
    prefs.begin("wifi", false);
    prefs.putBool("forceConfig", false);
    prefs.end();
  } else {
    if (!wifiManager.autoConnect(WIFI_AP_NAME)) {
      lcd.clear();
      lcd.print("WiFi loi!");
      lcd.setCursor(0, 1);
      lcd.print("Giu BOOT 3s");
      delay(3000);
      ESP.restart();
    }
  }

  lcd.clear();
  lcd.print("WiFi: OK");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  Serial.println("WiFi OK: " + WiFi.localIP().toString());
}

void checkConfigButton() {
  if (digitalRead(PIN_CONFIG_BTN) == LOW) {
    if (btnPressStart == 0) btnPressStart = millis();
    else if (millis() - btnPressStart > 3000) {
      prefs.begin("wifi", false);
      prefs.putBool("forceConfig", true);
      prefs.end();
      lcd.clear();
      lcd.print("Reset WiFi...");
      delay(1000);
      wifiManager.resetSettings();
      ESP.restart();
    }
  } else {
    btnPressStart = 0;
  }
}

// ===== MQTT =====
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  Serial.printf("MQTT [%s]: %s\n", topic, message.c_str());

  if (String(topic) == TOPIC_CONTROL_PUMP) {
    setPump(message.indexOf("ON") >= 0);
  } else if (String(topic) == TOPIC_CONTROL_FAN) {
    setFan(message.indexOf("ON") >= 0);
  } else if (String(topic) == TOPIC_CONFIG_THRESH) {
    parseThresholdConfig(message);
  }
}

void connectMQTT() {
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);

  while (!mqtt.connected()) {
    Serial.print("MQTT...");
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println(" OK");
      mqtt.subscribe(TOPIC_CONTROL_PUMP);
      mqtt.subscribe(TOPIC_CONTROL_FAN);
      mqtt.subscribe(TOPIC_CONFIG_THRESH);
    } else {
      Serial.printf(" fail(%d), retry\n", mqtt.state());
      delay(3000);
    }
  }
}

void parseThresholdConfig(String json) {
  int idx = json.indexOf("soilMin");
  if (idx >= 0) soilMin = json.substring(json.indexOf(':', idx) + 1).toInt();
  idx = json.indexOf("tempMax");
  if (idx >= 0) tempMax = json.substring(json.indexOf(':', idx) + 1).toInt();
  idx = json.indexOf("humidityMin");
  if (idx >= 0) humidityMin = json.substring(json.indexOf(':', idx) + 1).toInt();

  saveThresholds();
  publishThresholdAck();
  Serial.printf("Nguong: dat=%d, nhiet=%d, am=%d\n", soilMin, tempMax, humidityMin);
}

// ===== Cảm biến =====
int readSoilMoisture() {
  int raw = analogRead(PIN_SOIL_MOISTURE);
  int moisture = map(raw, 4095, 1500, 0, 100);
  return constrain(moisture, 0, 100);
}

void readSensors() {
  lastSoil = readSoilMoisture();
  lastTemp = dht.readTemperature();
  lastHumid = dht.readHumidity();
  if (isnan(lastTemp)) lastTemp = 0;
  if (isnan(lastHumid)) lastHumid = 0;
}

// ===== Output =====
void setPump(bool on) {
  pumpOn = on;
  digitalWrite(PIN_RELAY_PUMP, on ? HIGH : LOW);
}

void setFan(bool on) {
  fanOn = on;
  digitalWrite(PIN_RELAY_FAN, on ? HIGH : LOW);
}

// ===== CN04: Tự động hóa cục bộ =====
void runLocalAutomation() {
  if (!autoMode) return;
  if (lastSoil < soilMin && !pumpOn) {
    setPump(true);
    Serial.println("[AUTO] Bat bom");
  }
  if (lastSoil > soilMin + 15 && pumpOn) {
    setPump(false);
    Serial.println("[AUTO] Tat bom");
  }
  if (lastTemp > tempMax && !fanOn) {
    setFan(true);
    Serial.println("[AUTO] Bat quat");
  }
  if (lastTemp < tempMax - 3 && fanOn) {
    setFan(false);
  }
}

// ===== CN07: Cảnh báo =====
void checkAndSendAlerts() {
  unsigned long now = millis();
  if (now - lastAlertTime < 30000) return;

  if (lastSoil < soilMin - 10) {
    publishAlert("SOIL_CRITICAL", "Dat kho can nghiem trong!", "critical");
    lastAlertTime = now;
  } else if (lastTemp > tempMax) {
    publishAlert("TEMP_HIGH", "Nhiet do qua cao!", "warning");
    lastAlertTime = now;
  } else if (lastHumid < humidityMin) {
    publishAlert("HUMIDITY_LOW", "Do am KK thap!", "warning");
    lastAlertTime = now;
  }
}

void publishAlert(const char* type, const char* message, const char* level) {
  if (!mqtt.connected()) return;
  char payload[300];
  snprintf(payload, sizeof(payload),
    "{\"type\":\"%s\",\"message\":\"%s\",\"level\":\"%s\","
    "\"soilMoisture\":%d,\"temperature\":%.1f,\"humidity\":%d,"
    "\"deviceId\":\"esp32-01\"}",
    type, message, level, (int)lastSoil, lastTemp, (int)lastHumid);
  mqtt.publish(TOPIC_ALERT, payload);

  lcd.clear();
  lcd.print("CANH BAO!");
  lcd.setCursor(0, 1);
  lcd.print(message);
}

void publishSensorData() {
  if (!mqtt.connected()) return;
  char payload[300];
  snprintf(payload, sizeof(payload),
    "{\"deviceId\":\"esp32-01\",\"soilMoisture\":%d,\"temperature\":%.1f,"
    "\"humidity\":%d,\"pumpOn\":%s,\"fanOn\":%s,\"autoMode\":%s,\"source\":\"esp32\"}",
    (int)lastSoil, lastTemp, (int)lastHumid,
    pumpOn ? "true" : "false", fanOn ? "true" : "false", autoMode ? "true" : "false");
  mqtt.publish(TOPIC_SENSOR_DATA, payload);
}

void publishDeviceStatus() {
  if (!mqtt.connected()) return;
  char payload[100];
  snprintf(payload, sizeof(payload),
    "{\"online\":true,\"deviceId\":\"esp32-01\",\"ip\":\"%s\"}",
    WiFi.localIP().toString().c_str());
  mqtt.publish(TOPIC_DEVICE_STATUS, payload);
}

void publishThresholdAck() {
  if (!mqtt.connected()) return;
  char payload[100];
  snprintf(payload, sizeof(payload),
    "{\"soilMin\":%d,\"tempMax\":%d,\"humidityMin\":%d}",
    soilMin, tempMax, humidityMin);
  mqtt.publish(TOPIC_THRESH_ACK, payload);
}

void updateLCD() {
  lcd.setCursor(0, 0);
  lcd.printf("Dat:%3d%% T:%4.1f", (int)lastSoil, lastTemp);
  lcd.setCursor(0, 1);
  lcd.printf("KK:%3d%% %s%s", (int)lastHumid, pumpOn ? "B" : "-", fanOn ? "Q" : "-");
}

void saveThresholds() {
  prefs.begin("thresholds", false);
  prefs.putInt("soilMin", soilMin);
  prefs.putInt("tempMax", tempMax);
  prefs.putInt("humidityMin", humidityMin);
  prefs.end();
}

void loadThresholds() {
  prefs.begin("thresholds", true);
  soilMin = prefs.getInt("soilMin", DEFAULT_SOIL_MIN);
  tempMax = prefs.getInt("tempMax", DEFAULT_TEMP_MAX);
  humidityMin = prefs.getInt("humidityMin", DEFAULT_HUMIDITY_MIN);
  prefs.end();
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Smart Plant Monitor ===");

  pinMode(PIN_SOIL_MOISTURE, INPUT);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_RELAY_FAN, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, LOW);
  digitalWrite(PIN_RELAY_FAN, LOW);

  dht.begin();
  Wire.begin(PIN_LCD_SDA, PIN_LCD_SCL);
  lcd.init();
  lcd.backlight();
  lcd.print("Smart Plant");
  lcd.setCursor(0, 1);
  lcd.print("Khoi dong...");

  loadThresholds();
  setupWiFi();
  connectMQTT();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) setupWiFi();
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();
  checkConfigButton();

  unsigned long now = millis();

  if (now - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = now;
    readSensors();
  }
  if (now - lastAutoCheck >= AUTO_CHECK_MS) {
    lastAutoCheck = now;
    runLocalAutomation();
    checkAndSendAlerts();
  }
  if (now - lastMqttPublish >= MQTT_PUBLISH_MS) {
    lastMqttPublish = now;
    publishSensorData();
    publishDeviceStatus();
  }
  if (now - lastLcdUpdate >= LCD_UPDATE_MS) {
    lastLcdUpdate = now;
    updateLCD();
  }
}
