# Hệ thống giám sát môi trường đất và tự động chăm sóc cây thông minh

Đồ án IoT cuối kỳ — **Sản phẩm thật** | Vật lý cho CNTT HK3/2025-2026

## Kiến trúc

```
[Cảm biến đất + DHT11] → ESP32 → MQTT (Mosquitto) → Backend → Frontend
                              ↑                           ↓
                         [Bơm + Quạt + LCD]         MongoDB Atlas (Cloud)
                                                          ↓
                                                    Email + Telegram
```

**Không dùng Docker.** MQTT cài trực tiếp trên Windows, Database dùng MongoDB Atlas Cloud.

## Các thành phần chính

| Thành phần | File/Folder |
|------------|-------------|
| ESP32 firmware | `esp32/smart_plant_monitor/` |
| MQTT Broker | Mosquitto (cài trên máy tính) |
| Backend API | `backend/` |
| Website | `frontend/` |
| Cloud Database | MongoDB Atlas |
| Hướng dẫn cài đặt | `README.md` (phần Hướng dẫn chạy hệ thống) |
| Sơ đồ phần cứng | `docs/HARDWARE.md` |

## Ánh xạ yêu cầu đồ án

### Căn bản (4 điểm + 1 điểm nhóm)

| Mã | Luồng | Thiết bị |
|----|-------|----------|
| CN02 | Input → ESP → MQTT → Backend → Frontend | Cảm biến đất + DHT11 |
| CN03 | Frontend → Backend → MQTT → ESP → Output | Máy bơm + Quạt |

### Nâng cao (tối đa 4 điểm — chọn lọc khi báo cáo)

| YCNC | Chức năng | Điểm | Triển khai |
|------|-----------|------|------------|
| #1 | Input → Output (local) | 1.5 | CN04: đất khô → bơm (ESP32) |
| #2 | Input → Web Frontend | 1.5 | CN07: cảnh báo Toast realtime |
| #3 | Web FE → ESP → Output | 1.5 | CN08: cấu hình ngưỡng |
| #4 | Lưu Cloud theo thời gian | 1.5 | CN05: MongoDB Atlas |
| #5 | Hiển thị Chart từ Cloud | 1.5 | CN06: Chart.js |
| #6 | Push notification | 1.0 | CN09: Telegram |
| #7 | Email | 1.0 | Nodemailer + Gmail |
| #8 | Chatbot | 0.5 | Lệnh điều kiện đơn giản |
| #9 | Đăng nhập (DB) | 1.5 | JWT + MongoDB |
| #10 | Website tự xây | 2.0 | React + Node.js |
| #12 | Cấu hình WiFi (SP thật) | 2.0 | WiFiManager portal |

## Hướng dẫn chạy hệ thống (chi tiết)

### Yêu cầu trước khi bắt đầu

| Phần mềm | Phiên bản | Mục đích |
|----------|-----------|----------|
| Node.js | 18 trở lên | Chạy Backend + Frontend |
| Arduino IDE | Mới nhất | Nạp firmware ESP32 |
| Mosquitto | 2.x | MQTT Broker |
| Tài khoản MongoDB Atlas | Free M0 | Cloud Database |
| (Tuỳ chọn) Gmail + Telegram | — | Email & Push notification |

> **Quan trọng:** Máy tính, ESP32 và router WiFi phải **cùng một mạng LAN**. Ghi lại IP máy tính bằng lệnh `ipconfig` (dòng `IPv4 Address`, ví dụ `192.168.1.100`).

---

### Bước 1 — Cài Mosquitto MQTT Broker (Windows)

MQTT Broker là trung gian nhận/gửi dữ liệu giữa ESP32 và Backend.

1. Tải Mosquitto tại: https://mosquitto.org/download/
2. Chạy file cài đặt, tick chọn **Install as a Windows Service**
3. Sau khi cài xong, mở file cấu hình:
   ```
   C:\Program Files\mosquitto\mosquitto.conf
   ```
4. Thêm hoặc sửa các dòng sau (cho phép ESP32 kết nối trong mạng LAN):
   ```
   listener 1883
   allow_anonymous true
   ```
5. Khởi động lại dịch vụ Mosquitto:
   - Nhấn `Win + R` → gõ `services.msc` → Enter
   - Tìm **Mosquitto Broker** → chuột phải → **Restart**
6. Kiểm tra Mosquitto đang chạy — mở PowerShell:
   ```powershell
   netstat -an | findstr 1883
   ```
   Kết quả phải có dòng `LISTENING` ở port `1883`.

7. Ghi lại **IP máy tính** (dùng cho ESP32):
   ```powershell
   ipconfig
   ```
   Ví dụ: `IPv4 Address . . . . . . . . . : 192.168.1.100`

---

### Bước 2 — Tạo MongoDB Atlas (Cloud Database)

Database Cloud dùng để lưu lịch sử cảm biến và tài khoản đăng nhập.

1. Truy cập https://cloud.mongodb.com và đăng ký tài khoản miễn phí
2. Tạo **Project** mới (ví dụ: `SmartPlant`)
3. Bấm **Build a Database** → chọn **M0 FREE** → chọn region **Singapore** → Create
4. Tạo user database:
   - Vào **Database Access** → **Add New Database User**
   - Username: `smartplant` (hoặc tên tuỳ chọn)
   - Password: tạo mật khẩu mạnh → **Copy và lưu lại**
   - Quyền: **Read and write to any database**
5. Cho phép kết nối từ mọi IP (giai đoạn dev):
   - Vào **Network Access** → **Add IP Address**
   - Chọn **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm
6. Lấy chuỗi kết nối:
   - Vào **Database** → **Connect** → **Drivers** → chọn Node.js
   - Copy connection string, ví dụ:
     ```
     mongodb+srv://smartplant:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Thay `<password>` bằng mật khẩu thật, thêm tên database vào cuối:
     ```
     mongodb+srv://smartplant:MatKhau123@cluster0.xxxxx.mongodb.net/smart_plant?retryWrites=true&w=majority
     ```

---

### Bước 3 — Cấu hình và chạy Backend

Backend nhận dữ liệu MQTT, lưu Cloud, gửi cảnh báo Email/Telegram, cung cấp API cho Website.

1. Mở terminal tại thư mục project, vào folder backend:
   ```powershell
   cd "d:\IOT PROJECT'\backend"
   ```
2. Tạo file cấu hình từ mẫu:
   ```powershell
   copy .env.example .env
   ```
3. Mở file `.env` và điền đầy đủ:

   ```env
   PORT=3001
   MQTT_BROKER_URL=mqtt://localhost:1883
   MONGODB_URI=mongodb+srv://smartplant:MatKhau123@cluster0.xxxxx.mongodb.net/smart_plant?retryWrites=true&w=majority
   JWT_SECRET=chuoi-bi-mat-it-nhat-32-ky-tu-abc123

   # Email (tuỳ chọn — bỏ trống nếu chưa cấu hình)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=email-cua-ban@gmail.com
   SMTP_PASS=app-password-16-ky-tu
   ALERT_EMAIL_TO=email-nhan-canh-bao@gmail.com

   # Telegram (tuỳ chọn)
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   TELEGRAM_CHAT_ID=123456789
   ```

4. Cài dependencies và khởi động:
   ```powershell
   npm install
   npm run dev
   ```

5. Kiểm tra Backend chạy thành công — terminal phải hiện:
   ```
   [DB] Đã kết nối MongoDB Atlas
   [MQTT] Đã kết nối broker: mqtt://localhost:1883
   [Server] Backend chạy tại http://localhost:3001
   ```

6. Kiểm tra nhanh bằng trình duyệt: mở http://localhost:3001/health → phải thấy `{"status":"ok"}`

---

### Bước 4 — Cài và chạy Frontend (Website)

1. Mở terminal mới (giữ Backend đang chạy), vào folder frontend:
   ```powershell
   cd "d:\IOT PROJECT'\frontend"
   ```
2. Cài dependencies và chạy:
   ```powershell
   npm install
   npm run dev
   ```
3. Mở trình duyệt tại: **http://localhost:5173**
4. Lần đầu sử dụng:
   - Bấm **Đăng ký** → nhập username, email, mật khẩu (tối thiểu 6 ký tự)
   - Đăng nhập → vào Dashboard giám sát

---

### Bước 5 — Nạp firmware ESP32 (sản phẩm thật)

#### 5.1. Cài thư viện Arduino

Mở Arduino IDE → **Sketch** → **Include Library** → **Manage Libraries**, tìm và cài:

| Thư viện | Tác giả |
|----------|---------|
| PubSubClient | Nick O'Leary |
| DHT sensor library | Adafruit |
| Adafruit Unified Sensor | Adafruit |
| LiquidCrystal I2C | Frank de Brabander |
| WiFiManager | tzapu |

Cài board ESP32: **File** → **Preferences** → thêm URL:
```
https://espressif.github.io/arduino-esp32/package_esp32_index.json
```
Sau đó **Tools** → **Board** → **Boards Manager** → tìm `esp32` → Install.

#### 5.2. Cấu hình firmware

1. Mở file `esp32/config.h`
2. Sửa dòng `MQTT_SERVER` thành **IP máy tính** đã ghi ở Bước 1:
   ```cpp
   #define MQTT_SERVER     "192.168.1.100"   // ← IP máy bạn
   ```
3. Mở file `esp32/smart_plant_monitor/smart_plant_monitor.ino`
4. Chọn board: **Tools** → **Board** → **ESP32 Dev Module**
5. Chọn cổng COM: **Tools** → **Port** → chọn cổng ESP32
6. Bấm **Upload** (mũi tên →) để nạp firmware

#### 5.3. Cấu hình WiFi lần đầu (SmartPlant-Setup)

Sau khi nạp xong, ESP32 tự vào chế độ cấu hình WiFi:

1. Cắm nguồn ESP32 → đợi 5–10 giây
2. Trên điện thoại, vào **Cài đặt WiFi** → tìm mạng **`SmartPlant-Setup`** → kết nối
3. Trình duyệt tự mở trang cấu hình (nếu không, mở http://192.168.4.1)
4. Chọn WiFi nhà → nhập mật khẩu WiFi → **Save**
5. ESP32 tự khởi động lại và kết nối WiFi nhà

**Đổi WiFi sau này:** Giữ nút **BOOT** (GPIO 0) **3 giây** khi bật nguồn → lặp lại bước 2–4.

#### 5.4. Kiểm tra ESP32 qua Serial Monitor

1. Arduino IDE → **Tools** → **Serial Monitor** → baud rate **115200**
2. Kết quả mong đợi:
   ```
   WiFi OK: 192.168.1.105
   MQTT... OK
   ```
3. LCD hiển thị: độ ẩm đất, nhiệt độ, trạng thái bơm/quạt

---

### Bước 6 — Cấu hình Email cảnh báo (tuỳ chọn)

1. Vào https://myaccount.google.com → bật **Xác minh 2 bước**
2. Tạo App Password: https://myaccount.google.com/apppasswords
   - Chọn app: **Mail**, thiết bị: **Windows Computer**
   - Copy mật khẩu 16 ký tự (không có dấu cách)
3. Điền vào `backend/.env`:
   ```env
   SMTP_USER=email-gui@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   ALERT_EMAIL_TO=email-nhan@gmail.com
   ```
4. Khởi động lại Backend (`Ctrl+C` → `npm run dev`)

---

### Bước 7 — Cấu hình Telegram Push (tuỳ chọn)

1. Mở Telegram → tìm **@BotFather** → gửi `/newbot` → đặt tên bot → lấy **Token**
2. Tìm bot vừa tạo → gửi tin nhắn bất kỳ (ví dụ: `xin chào`)
3. Mở trình duyệt, truy cập (thay `<TOKEN>`):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
4. Tìm `"chat":{"id":123456789` → copy số `id`
5. Điền vào `backend/.env`:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:AAFxxxx
   TELEGRAM_CHAT_ID=123456789
   ```
6. Khởi động lại Backend

---

### Bước 8 — Kiểm tra toàn hệ thống

Chạy lần lượt và đối chiếu bảng sau:

| # | Việc cần làm | Kết quả đúng |
|---|--------------|--------------|
| 1 | Mosquitto đang chạy | `netstat` thấy port 1883 LISTENING |
| 2 | Backend khởi động | Log: kết nối MongoDB + MQTT thành công |
| 3 | Frontend mở được | http://localhost:5173 → đăng nhập OK |
| 4 | ESP32 Serial Monitor | WiFi OK, MQTT OK |
| 5 | Website hiển thị số liệu | Độ ẩm đất, nhiệt độ, độ ẩm KK cập nhật mỗi ~5 giây |
| 6 | Badge trạng thái | ESP32 hiện **Online** (màu xanh) |
| 7 | Bấm **BẬT bơm** trên Web | Relay kêu *click*, Serial log `Bơm: BẬT` |
| 8 | Bấm **BẬT quạt** trên Web | Quạt chạy, Serial log `Quạt: BẬT` |
| 9 | Đổi ngưỡng độ ẩm đất trên Web | ESP32 Serial log `Nguong: dat=...` |
| 10 | Biểu đồ lịch sử | Chart có đường dữ liệu sau vài phút |
| 11 | Chatbot gõ `trạng thái` | Bot trả lời số liệu hiện tại |
| 12 | Để đất khô / hạ ngưỡng | Toast cảnh báo đỏ trên Web + Email/Telegram |

---

### Bước 9 — Thứ tự khởi động mỗi lần sử dụng

Mỗi lần demo hoặc vấn đáp, bật theo thứ tự:

```
1. Bật router WiFi
2. Bật máy tính → kiểm tra Mosquitto service đang chạy
3. Chạy Backend:  cd backend  →  npm run dev
4. Chạy Frontend: cd frontend →  npm run dev
5. Cắm nguồn ESP32 → đợi kết nối WiFi + MQTT
6. Mở http://localhost:5173 → đăng nhập → giám sát
```

---

### Sơ đồ mạng

```
[Điện thoại / Laptop] ─── WiFi ─── [Router mạng nhà]
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
         [ESP32 + Cảm biến]    [PC: Mosquitto :1883]    [PC: Backend :3001]
              │                         │                   [Frontend :5173]
              └──────── MQTT ───────────┘                         │
                                                                  │
                                                         [MongoDB Atlas Cloud]
                                                                  │
                                                         [Gmail SMTP + Telegram]
```

---

### Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| Backend: `MQTT client chưa kết nối` | Mosquitto chưa chạy | Restart service Mosquitto |
| Backend: lỗi MongoDB | Sai URI hoặc chưa whitelist IP | Kiểm tra `.env`, Network Access Atlas |
| ESP32: `WiFi loi!` | Sai mật khẩu WiFi | Giữ BOOT 3s → cấu hình lại WiFi |
| ESP32: MQTT fail | Sai `MQTT_SERVER` | Sửa IP trong `config.h`, nạp lại |
| Website: ESP32 Offline | ESP32 chưa kết nối MQTT | Kiểm tra cùng mạng WiFi, Serial Monitor |
| Website: 401 Unauthorized | Chưa đăng nhập / token hết hạn | Đăng nhập lại |
| Email không gửi | Sai App Password Gmail | Tạo lại App Password, không dùng mật khẩu thường |
| Telegram không gửi | Sai token hoặc chat_id | Gửi tin nhắn cho bot trước, lấy lại chat_id |


## Chatbot — các lệnh hỗ trợ

- `độ ẩm đất` / `nhiệt độ` / `trạng thái`
- `bật bơm` / `tắt bơm` / `bật quạt` / `tắt quạt`
- `cảnh báo` / `ngưỡng` / `giúp`

## Phân công nhóm gợi ý

| SV | Phụ trách |
|----|-----------|
| SV1 | ESP32 + cảm biến + CN02 + CN04 + WiFi config |
| SV2 | Backend + MQTT + Cloud DB + Email/Telegram |
| SV3 | Frontend + Chart + Chatbot + Đăng nhập |

## Lưu ý quy định

- Thiết bị Input/Output giữa các luồng phải **đôi một khác nhau**
- Mỗi yêu cầu nâng cao chỉ hiện bởi **một** sinh viên khi vấn đáp
- Sản phẩm thật: cộng tối đa 1 điểm nếu hoạt động đúng và giải thích được luồng
