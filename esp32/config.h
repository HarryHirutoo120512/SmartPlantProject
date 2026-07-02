#ifndef CONFIG_H
#define CONFIG_H

// ===== MQTT Broker =====
// IP máy tính chạy Mosquitto (cùng mạng WiFi với ESP32)
#define MQTT_SERVER     "192.168.1.100"
#define MQTT_PORT       1883
#define MQTT_CLIENT_ID  "esp32-plant-01"

// ===== MQTT Topics =====
#define TOPIC_SENSOR_DATA     "plant/sensor/data"
#define TOPIC_CONTROL_PUMP    "plant/control/pump"
#define TOPIC_CONTROL_FAN     "plant/control/fan"
#define TOPIC_CONFIG_THRESH   "plant/config/threshold"
#define TOPIC_ALERT           "plant/alert"
#define TOPIC_DEVICE_STATUS   "plant/device/status"
#define TOPIC_THRESH_ACK      "plant/config/threshold/ack"

// ===== WiFi Portal (cấu hình khi mới mua / đổi WiFi) =====
#define WIFI_AP_NAME        "SmartPlant-Setup"
#define WIFI_AP_PASSWORD    ""          // Để trống = mở, không cần mật khẩu
#define WIFI_CONFIG_TIMEOUT 180         // Giây chờ cấu hình

// ===== GPIO Pins =====
#define PIN_SOIL_MOISTURE  34
#define PIN_DHT            4
#define PIN_RELAY_PUMP     26
#define PIN_RELAY_FAN      27
#define PIN_LCD_SDA        21
#define PIN_LCD_SCL        22
#define PIN_CONFIG_BTN     0            // Nút BOOT - giữ 3s để vào chế độ cấu hình WiFi

// ===== Ngưỡng mặc định =====
#define DEFAULT_SOIL_MIN     40
#define DEFAULT_TEMP_MAX     35
#define DEFAULT_HUMIDITY_MIN 30

// ===== Chu kỳ =====
#define SENSOR_INTERVAL_MS   5000
#define LCD_UPDATE_MS        2000
#define MQTT_PUBLISH_MS      5000
#define AUTO_CHECK_MS        3000

#endif
