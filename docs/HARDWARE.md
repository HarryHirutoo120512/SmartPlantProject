# Sơ đồ kết nối phần cứng ESP32

## Danh sách linh kiện

| STT | Linh kiện | Số lượng | Ghi chú |
|-----|-----------|----------|---------|
| 1 | ESP32 DevKit | 1 | Board chính |
| 2 | Cảm biến độ ẩm đất (Soil Moisture) | 1 | Analog output |
| 3 | DHT11 | 1 | Nhiệt độ + độ ẩm không khí |
| 4 | Module Relay 2 kênh | 1 | Điều khiển bơm + quạt |
| 5 | Máy bơm mini 5V | 1 | Output - tưới nước |
| 6 | Quạt 5V / Motor DC | 1 | Output - tản nhiệt |
| 7 | LCD I2C 16x2 | 1 | Hiển thị tại chỗ |
| 8 | Nguồn 5V 2A | 1 | Cấp nguồn relay/bơm |
| 9 | Dây Dupont | nhiều | Kết nối |

## Sơ đồ chân chi tiết

```
ESP32 GPIO 34  ──── AO (Cảm biến độ ẩm đất)
ESP32 GPIO 4   ──── DATA (DHT11)
ESP32 3.3V     ──── VCC (DHT11)
ESP32 GND      ──── GND (DHT11, Cảm biến đất, Relay, LCD)

ESP32 GPIO 26  ──── IN1 (Relay) ──── COM/NO ──── Máy bơm (+5V/GND)
ESP32 GPIO 27  ──── IN2 (Relay) ──── COM/NO ──── Quạt (+5V/GND)

ESP32 GPIO 21  ──── SDA (LCD I2C)
ESP32 GPIO 22  ──── SCL (LCD I2C)
ESP32 5V       ──── VCC (Relay module)
```

## Lưu ý an toàn

- Dùng nguồn riêng 5V cho bơm/quạt nếu dòng lớn, GND chung với ESP32
- Relay active LOW hoặc HIGH tùy module — chỉnh code nếu cần
- Cảm biến đất không ngâm phần mạch điện tử, chỉ phần đầu dò

## Cấu hình WiFi sản phẩm thật (YCNC #12)

- Lần đầu: ESP32 tạo AP `SmartPlant-Setup` → portal cấu hình WiFi
- Đổi WiFi: giữ nút BOOT (GPIO 0) 3 giây khi khởi động
- Thư viện: **WiFiManager by tzapu**

## MQTT Broker

- Cài Mosquitto trên máy tính (không Docker)
- `MQTT_SERVER` trong `config.h` = IP máy tính LAN

```
CN02 (Căn bản 1):
  [Cảm biến đất] ──┐
  [DHT11]         ──┼── ESP32 ── MQTT ── Backend ── Frontend

CN03 (Căn bản 2):
  Frontend ── Backend ── MQTT ── ESP32 ── [Relay Bơm/Quạt]

CN04 (Nâng cao 1 - Local):
  [Cảm biến đất] ── ESP32 ── [Máy bơm]  (không qua Internet)

CN07 (Nâng cao 2):
  [Cảm biến] ── ESP32 ── MQTT ── Backend ── Frontend (Toast)

CN08 (Nâng cao 3):
  Frontend ── Backend ── MQTT ── ESP32 ── [Bơm/Quạt theo ngưỡng mới]
```
