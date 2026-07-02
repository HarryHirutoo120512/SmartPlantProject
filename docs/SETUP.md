# Hướng dẫn cài đặt (không dùng Docker)

## Tổng quan stack

| Thành phần | Công nghệ | Vai trò |
|------------|-----------|---------|
| ESP32 | Arduino + WiFiManager | Thu thập cảm biến, điều khiển bơm/quạt |
| MQTT | Mosquitto (cài trên Windows) | Trung gian truyền dữ liệu |
| Backend | Node.js + Express | API, MQTT client, Socket.IO |
| Frontend | React + Vite | Dashboard giám sát |
| Cloud DB | MongoDB Atlas (free) | Lưu lịch sử + tài khoản đăng nhập |
| Email | Gmail SMTP (Nodemailer) | Cảnh báo qua email |
| Push | Telegram Bot API | Thông báo nhanh điện thoại |

---

## Bước 1: Cài Mosquitto MQTT Broker (Windows)

1. Tải Mosquitto: https://mosquitto.org/download/
2. Cài đặt, chọn **Install as service**
3. Mở file cấu hình: `C:\Program Files\mosquitto\mosquitto.conf`
4. Thêm/sửa các dòng:

```
listener 1883
allow_anonymous true
```

5. Khởi động lại service Mosquitto (Services → Mosquitto → Restart)
6. Kiểm tra: mở PowerShell chạy `netstat -an | findstr 1883` — phải thấy port 1883 LISTENING

> **Lưu ý:** Máy tính và ESP32 phải cùng mạng WiFi LAN. Ghi lại IP máy tính (`ipconfig`) để cấu hình ESP32.

---

## Bước 2: Tạo MongoDB Atlas (Cloud)

1. Đăng ký tại https://cloud.mongodb.com (free tier M0)
2. Tạo Cluster → chọn region gần Việt Nam (Singapore)
3. Database Access → tạo user + password
4. Network Access → Add IP Address → **Allow Access from Anywhere** (0.0.0.0/0) để dev
5. Connect → Drivers → copy connection string:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/smart_plant
   ```

---

## Bước 3: Chạy Backend

```powershell
cd backend
copy .env.example .env
# Sửa .env: MONGODB_URI, JWT_SECRET, SMTP, Telegram
npm install
npm run dev
```

Backend chạy tại **http://localhost:3001**

---

## Bước 4: Chạy Frontend

```powershell
cd frontend
npm install
npm run dev
```

Mở **http://localhost:5173** → Đăng ký tài khoản → Đăng nhập

---

## Bước 5: Nạp firmware ESP32

### Thư viện Arduino cần cài

- PubSubClient
- DHT sensor library (Adafruit)
- Adafruit Unified Sensor
- LiquidCrystal I2C
- **WiFiManager by tzapu**

### Cấu hình

1. Mở `esp32/config.h`
2. Đặt `MQTT_SERVER` = IP máy tính chạy Mosquitto (ví dụ `192.168.1.100`)
3. Nạp `esp32/smart_plant_monitor/smart_plant_monitor.ino`

### Cấu hình WiFi lần đầu (sản phẩm thật)

1. Bật ESP32 lần đầu → tự tạo WiFi **SmartPlant-Setup**
2. Điện thoại kết nối WiFi `SmartPlant-Setup`
3. Trình duyệt tự mở portal cấu hình (hoặc vào `192.168.4.1`)
4. Chọn WiFi nhà + nhập mật khẩu → Lưu
5. ESP32 tự kết nối và gửi dữ liệu qua MQTT

### Đổi WiFi sau này

**Giữ nút BOOT (GPIO 0) 3 giây** khi bật nguồn → vào lại chế độ cấu hình WiFi.

---

## Bước 6: Cấu hình thông báo

### Email (Gmail)

1. Bật xác thực 2 bước
2. Tạo App Password: https://myaccount.google.com/apppasswords
3. Điền `SMTP_USER`, `SMTP_PASS`, `ALERT_EMAIL_TO` trong `.env`

### Telegram Push

1. Tạo bot qua [@BotFather](https://t.me/BotFather)
2. Gửi tin nhắn cho bot
3. Truy cập `https://api.telegram.org/bot<TOKEN>/getUpdates` → lấy `chat_id`
4. Điền `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` trong `.env`

---

## Kiểm tra hệ thống

| Kiểm tra | Kỳ vọng |
|----------|---------|
| Serial Monitor ESP32 | WiFi OK, MQTT OK, dữ liệu cảm biến |
| Backend log | `[MQTT] Đã kết nối broker`, `[DB] Đã kết nối MongoDB Atlas` |
| Website | Số liệu cập nhật realtime, biểu đồ có dữ liệu |
| Bấm BẬT bơm | Relay kêu click, Serial log "Bơm: BẬT" |
| Đổi ngưỡng trên Web | ESP32 nhận và áp dụng ngưỡng mới |
| Đất khô (hoặc giảm ngưỡng) | Toast cảnh báo + Email/Telegram |

---

## Sơ đồ mạng

```
[Điện thoại/Laptop] ── WiFi ── [Router]
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
               [ESP32]        [PC: Mosquitto]  [PC: Backend+Frontend]
                    │               │               │
                    └──── MQTT ─────┴───────────────┘
                                            │
                                     [MongoDB Atlas Cloud]
                                            │
                                    [Gmail + Telegram]
```
