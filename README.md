# Hệ thống giám sát môi trường đất và tự động chăm sóc cây thông minh



Đồ án IoT cuối kỳ — **Sản phẩm thật** | Vật lý cho CNTT HK3/2025-2026



## Kiến trúc



```

[Cảm biến đất + DHT11] → ESP32 → MQTT (Mosquitto) → Backend → Node-RED Dashboard

                              ↑                           ↓

                         [Bơm + Quạt + LCD]         MongoDB Atlas (Cloud)

                                                          ↓

                                                    Email + Telegram

```



**Không dùng Docker.** MQTT cài trực tiếp trên Windows, Database dùng MongoDB Atlas Cloud, Frontend trên **Node-RED**.



## Các thành phần chính



| Thành phần | File/Folder |

|------------|-------------|

| ESP32 firmware | `esp32/smart_plant_monitor/` |

| MQTT Broker | Mosquitto (cài trên máy tính) |

| Backend API | `backend/` |

| Frontend (Node-RED) | `nodered/` — import flow mẫu, thiết kế tại http://localhost:1880 |

| Cloud Database | MongoDB Atlas |

| Hướng dẫn Node-RED | `docs/NODERED.md` |

| Sơ đồ phần cứng | `docs/HARDWARE.md` |



## Frontend Node-RED — làm ở đâu?



Node-RED **không** có folder code như React. Bạn thiết kế giao diện **trên trình duyệt**:



| Việc cần làm | Mở địa chỉ |
|--------------|------------|
| Kéo-thả flow (chỗ "code" frontend) | http://localhost:1880 |
| Xem Dashboard người dùng | http://localhost:1880/ui |
| File flow mẫu trong project | `nodered/flows/smart-plant-starter.json` |
| Hướng dẫn chi tiết | `nodered/README.md` |



**Các bước nhanh:**

1. Chạy `node-red` trong terminal
2. Mở http://localhost:1880 → menu **☰** → **Import** → chọn file `nodered/flows/smart-plant-starter.json`
3. Sửa username/password trong node **Đăng nhập** → bấm **Deploy**
4. Mở http://localhost:1880/ui → xem gauge, nút điều khiển bơm/quạt

> Flow sau khi chỉnh sửa: **Export** từ Node-RED → lưu lại vào `nodered/flows/` để commit git cho cả nhóm.



## Ánh xạ yêu cầu đồ án



### Căn bản (4 điểm + 1 điểm nhóm)



| Mã | Luồng | Thiết bị |

|----|-------|----------|

| CN02 | Input → ESP → MQTT → Backend → Node-RED | Cảm biến đất + DHT11 |

| CN03 | Node-RED → Backend → MQTT → ESP → Output | Máy bơm + Quạt |



### Nâng cao (tối đa 4 điểm — chọn lọc khi báo cáo)



| YCNC | Chức năng | Điểm | Triển khai |

|------|-----------|------|------------|

| #1 | Input → Output (local) | 1.5 | CN04: đất khô → bơm (ESP32) |

| #2 | Input → Web Frontend | 1.5 | CN07: cảnh báo trên Node-RED Dashboard |

| #3 | Web FE → ESP → Output | 1.5 | CN08: cấu hình ngưỡng qua Node-RED |

| #4 | Lưu Cloud theo thời gian | 1.5 | CN05: MongoDB Atlas |

| #5 | Hiển thị Chart từ Cloud | 1.5 | CN06: Chart trên Node-RED Dashboard |

| #6 | Push notification | 1.0 | CN09: Telegram |

| #7 | Email | 1.0 | Nodemailer + Gmail |

| #8 | Chatbot | 0.5 | API chatbot — gọi từ Node-RED |

| #9 | Đăng nhập (DB) | 1.5 | JWT + MongoDB |

| #12 | Cấu hình WiFi (SP thật) | 2.0 | WiFiManager portal |



> **Lưu ý:** YCNC #10 (Website tự xây, không dùng Node-RED) **không áp dụng** vì Frontend dùng Node-RED.



## Hướng dẫn chạy hệ thống (chi tiết)



### Yêu cầu trước khi bắt đầu



| Phần mềm | Phiên bản | Mục đích |

|----------|-----------|----------|

| Node.js | 18 trở lên | Chạy Backend + Node-RED |

| Node-RED | Mới nhất | Dashboard giám sát |

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



Backend nhận dữ liệu MQTT, lưu Cloud, gửi cảnh báo Email/Telegram, cung cấp REST API cho Node-RED.



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



### Bước 4 — Tải và cài Node-RED (Frontend Dashboard)



Frontend do bạn tự thiết kế trên Node-RED, kết nối Backend qua REST API.



#### 4.1. Yêu cầu trước — cài Node.js



Node-RED chạy trên nền Node.js, cần cài Node.js trước:



1. Truy cập: **https://nodejs.org/**

2. Tải bản **LTS** (khuyến nghị 18.x hoặc 20.x) cho Windows

3. Chạy file `.msi` → Next → tick **Automatically install necessary tools** → Install

4. Kiểm tra cài thành công — mở PowerShell:

   ```powershell

   node -v

   npm -v

   ```

   Kết quả ví dụ: `v20.x.x` và `10.x.x`



#### 4.2. Tải và cài Node-RED



**Trang chủ Node-RED:** https://nodered.org/

**Hướng dẫn cài đặt chính thức:** https://nodered.org/docs/getting-started/local



Cài Node-RED qua npm (cách phổ biến trên Windows):



1. Mở **PowerShell** hoặc **Command Prompt** với quyền **Administrator** (chuột phải → Run as administrator)

2. Chạy lệnh cài đặt:

   ```powershell

   npm install -g --unsafe-perm node-red

   ```

   > Flag `--unsafe-perm` cần thiết trên Windows để cài global package không bị lỗi quyền.

3. Đợi quá trình tải và cài hoàn tất (có thể mất 2–5 phút tùy mạng)

4. Kiểm tra đã cài thành công:

   ```powershell

   node-red --help

   ```

   Nếu hiện danh sách tùy chọn → cài OK.



**Nếu lỗi quyền `EACCES` hoặc `permission denied`:**



```powershell

# Cách 1: Chạy lại PowerShell as Administrator rồi cài lại



# Cách 2: Đổi thư mục npm global (không cần admin)

mkdir $HOME\.npm-global

npm config set prefix "$HOME\.npm-global"

# Thêm vào PATH: $HOME\.npm-global (Settings → Environment Variables → Path)

npm install -g --unsafe-perm node-red

```



#### 4.3. Khởi động Node-RED



1. Mở terminal mới (giữ Backend đang chạy ở tab khác)

2. Chạy:

   ```powershell

   node-red

   ```

3. Terminal hiện log tương tự:

   ```

   Welcome to Node-RED

   ===================

   2 Jul 12:00:00 - [info] Server now running at http://127.0.0.1:1880/

   ```

4. Mở trình duyệt: **http://localhost:1880** → vào giao diện kéo-thả flow



> **Lưu ý:** Mỗi lần tắt terminal, Node-RED cũng tắt. Muốn chạy lại thì gõ `node-red` lần nữa.



#### 4.4. Cài Dashboard UI (bắt buộc cho giao diện giám sát)



1. Trong Node-RED editor (http://localhost:1880), bấm **☰** (menu góc phải trên) → **Manage palette**

2. Tab **Install** → ô tìm kiếm gõ: `node-red-dashboard`

3. Bấm **Install** bên cạnh `node-red-dashboard` (tác giả: node-red-contrib-dashboard)

4. Bấm **Close** → **Deploy** (nút đỏ góc phải trên)



Sau khi cài, Dashboard UI truy cập tại: **http://localhost:1880/ui**



Các node Dashboard hữu ích cho đồ án:



| Node | Dùng để |

|------|---------|

| `gauge` | Hiển thị độ ẩm đất, nhiệt độ |

| `chart` | Biểu đồ lịch sử (CN06) |

| `button` | Bật/tắt bơm, quạt (CN03) |

| `text` | Hiển thị trạng thái ESP32 |

| `notification` | Cảnh báo popup (CN07) |

| `slider` / `form` | Cấu hình ngưỡng (CN08) |



#### 4.5. Thiết kế flow kết nối Backend



Thiết kế flow theo hướng dẫn chi tiết tại **[docs/NODERED.md](docs/NODERED.md)**:



- Đăng nhập lấy JWT token (`POST /api/auth/login`)

- Hiển thị cảm biến (gauge/text) — polling `GET /api/status` mỗi 5 giây

- Nút điều khiển bơm/quạt — `POST /api/control/pump`, `/api/control/fan`

- Biểu đồ lịch sử từ Cloud — `GET /api/history`

- Thông báo cảnh báo realtime — Socket.IO event `alert:new`

- Form cấu hình ngưỡng — `PUT /api/thresholds`



#### 4.6. Kiểm tra Node-RED hoạt động



| Kiểm tra | Kết quả đúng |

|----------|--------------|

| `node-red` chạy không lỗi | Log: `Server now running at http://127.0.0.1:1880/` |

| Mở http://localhost:1880 | Thấy giao diện flow editor |

| Cài `node-red-dashboard` | Tab Dashboard xuất hiện bên trái |

| Mở http://localhost:1880/ui | Thấy trang Dashboard (có thể trống nếu chưa thiết kế flow) |

| Backend đang chạy | Gọi API từ flow không bị `ECONNREFUSED` |



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

| 3 | Node-RED chạy | http://localhost:1880 mở được editor |

| 4 | ESP32 Serial Monitor | WiFi OK, MQTT OK |

| 5 | Dashboard hiển thị số liệu | Độ ẩm đất, nhiệt độ cập nhật mỗi ~5 giây |

| 6 | Trạng thái ESP32 trên Dashboard | Hiện Online |

| 7 | Bấm **BẬT bơm** trên Dashboard | Relay kêu *click*, Serial log `Bơm: BẬT` |

| 8 | Bấm **BẬT quạt** trên Dashboard | Quạt chạy, Serial log `Quạt: BẬT` |

| 9 | Đổi ngưỡng trên Dashboard | ESP32 Serial log `Nguong: dat=...` |

| 10 | Biểu đồ lịch sử | Chart có dữ liệu sau vài phút |

| 11 | Chatbot qua API | `POST /api/chatbot/message` trả lời đúng |

| 12 | Để đất khô / hạ ngưỡng | Cảnh báo trên Dashboard + Email/Telegram |



---



### Bước 9 — Thứ tự khởi động mỗi lần sử dụng



Mỗi lần demo hoặc vấn đáp, bật theo thứ tự:



```

1. Bật router WiFi

2. Bật máy tính → kiểm tra Mosquitto service đang chạy

3. Chạy Backend:   cd backend  →  npm run dev

4. Chạy Node-RED:  node-red

5. Cắm nguồn ESP32 → đợi kết nối WiFi + MQTT

6. Mở http://localhost:1880/ui → giám sát trên Dashboard

```



---



### Sơ đồ mạng



```

[Điện thoại / Laptop] ─── WiFi ─── [Router mạng nhà]

                                        │

              ┌─────────────────────────┼─────────────────────────┐

              │                         │                         │

         [ESP32 + Cảm biến]    [PC: Mosquitto :1883]    [PC: Backend :3001]

              │                         │              [Node-RED :1880]

              └──────── MQTT ───────────┘                         │

                                                                  │

                                                         [MongoDB Atlas Cloud]

                                                                  │

                                                         [Gmail SMTP + Telegram]

```



---



### API Backend cho Node-RED



| Method | Endpoint | Mô tả |

|--------|----------|-------|

| POST | `/api/auth/login` | Đăng nhập → JWT token |

| POST | `/api/auth/register` | Đăng ký tài khoản |

| GET | `/api/status` | Trạng thái cảm biến hiện tại |

| GET | `/api/history?hours=24` | Lịch sử từ Cloud |

| GET | `/api/alerts` | Danh sách cảnh báo |

| POST | `/api/control/pump` | `{"on": true/false}` |

| POST | `/api/control/fan` | `{"on": true/false}` |

| PUT | `/api/thresholds` | Cấu hình ngưỡng |

| POST | `/api/chatbot/message` | `{"message": "trạng thái"}` |



Chi tiết tích hợp Node-RED: **[docs/NODERED.md](docs/NODERED.md)**



---



### Xử lý lỗi thường gặp



| Lỗi | Nguyên nhân | Cách sửa |

|-----|-------------|----------|

| Backend: `MQTT client chưa kết nối` | Mosquitto chưa chạy | Restart service Mosquitto |

| Backend: lỗi MongoDB | Sai URI hoặc chưa whitelist IP | Kiểm tra `.env`, Network Access Atlas |

| ESP32: `WiFi loi!` | Sai mật khẩu WiFi | Giữ BOOT 3s → cấu hình lại WiFi |

| ESP32: MQTT fail | Sai `MQTT_SERVER` | Sửa IP trong `config.h`, nạp lại |

| Node-RED: 401 Unauthorized | Chưa gửi JWT token | Đăng nhập API, thêm header `Authorization: Bearer <token>` |

| Dashboard không cập nhật | Flow Node-RED chưa cấu hình | Kiểm tra HTTP Request node, xem NODERED.md |

| Email không gửi | Sai App Password Gmail | Tạo lại App Password |

| Telegram không gửi | Sai token hoặc chat_id | Gửi tin nhắn cho bot trước, lấy lại chat_id |



---



## Chatbot API — các lệnh hỗ trợ



Gọi `POST /api/chatbot/message` với body `{"message": "..."}`:



- `độ ẩm đất` / `nhiệt độ` / `trạng thái`

- `bật bơm` / `tắt bơm` / `bật quạt` / `tắt quạt`

- `cảnh báo` / `ngưỡng` / `giúp`



## Phân công nhóm gợi ý



| SV | Phụ trách |

|----|-----------|

| SV1 | ESP32 + cảm biến + CN02 + CN04 + WiFi config |

| SV2 | Backend + MQTT + Cloud DB + Email/Telegram |

| SV3 | Node-RED Dashboard + Chart + Chatbot + Đăng nhập |



## Lưu ý quy định



- Thiết bị Input/Output giữa các luồng phải **đôi một khác nhau**

- Mỗi yêu cầu nâng cao chỉ hiện bởi **một** sinh viên khi vấn đáp

- Sản phẩm thật: cộng tối đa 1 điểm nếu hoạt động đúng và giải thích được luồng

- Dùng Node-RED cho Frontend → **không** nhận điểm YCNC #10 (website tự xây)


