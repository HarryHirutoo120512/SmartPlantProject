# Hướng dẫn cài đặt (không dùng Docker)

> Frontend Dashboard xây trên **Node-RED** — xem chi tiết tại [NODERED.md](NODERED.md)

## Tổng quan stack

| Thành phần | Công nghệ | Vai trò |
|------------|-----------|---------|
| ESP32 | Arduino + WiFiManager | Thu thập cảm biến, điều khiển bơm/quạt |
| MQTT | Mosquitto (cài trên Windows) | Trung gian truyền dữ liệu |
| Backend | Node.js + Express | API, MQTT client, Socket.IO |
| Frontend | Node-RED Dashboard | Giao diện giám sát & điều khiển |
| Cloud DB | MongoDB Atlas (free) | Lưu lịch sử + tài khoản đăng nhập |
| Email | Gmail SMTP (Nodemailer) | Cảnh báo qua email |
| Push | Telegram Bot API | Thông báo nhanh điện thoại |

---

## Bước 1: Cài Mosquitto MQTT Broker (Windows)

1. Tải Mosquitto: https://mosquitto.org/download/
2. Cài đặt, chọn **Install as service**
3. Mở file cấu hình: `C:\Program Files\mosquitto\mosquitto.conf`
4. Thêm/sửa:
   ```
   listener 1883
   allow_anonymous true
   ```
5. Restart service Mosquitto
6. Kiểm tra: `netstat -an | findstr 1883` → port 1883 LISTENING
7. Ghi IP máy tính: `ipconfig`

---

## Bước 2: Tạo MongoDB Atlas (Cloud)

1. Đăng ký https://cloud.mongodb.com (free tier M0)
2. Tạo Cluster → region Singapore
3. Database Access → tạo user + password
4. Network Access → Allow Access from Anywhere (0.0.0.0/0)
5. Copy connection string → thêm `/smart_plant` vào URI

---

## Bước 3: Chạy Backend

```powershell
cd backend
copy .env.example .env
# Sửa .env: MONGODB_URI, JWT_SECRET, SMTP, Telegram
npm install
npm run dev
```

Backend: **http://localhost:3001**

---

## Bước 4: Chạy Node-RED (Frontend)

```powershell
npm install -g --unsafe-perm node-red
node-red
```

Mở **http://localhost:1880** → thiết kế Dashboard theo [NODERED.md](NODERED.md)

---

## Bước 5: Nạp firmware ESP32

Xem README.md — Bước 5 (ESP32)

---

## Bước 6: Cấu hình Email & Telegram

Xem README.md — Bước 6 & 7

---

## Kiểm tra hệ thống

| Kiểm tra | Kỳ vọng |
|----------|---------|
| Serial Monitor ESP32 | WiFi OK, MQTT OK |
| Backend log | Kết nối MongoDB + MQTT thành công |
| Node-RED Dashboard | Hiển thị số liệu cảm biến |
| Bấm điều khiển bơm trên Dashboard | Relay kêu click |
| Đổi ngưỡng | ESP32 nhận qua MQTT |
| Cảnh báo | Notification trên Dashboard + Email/Telegram |
