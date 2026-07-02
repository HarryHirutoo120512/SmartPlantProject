# Tích hợp Node-RED với Backend

Frontend (Dashboard) được xây dựng trên **Node-RED**, kết nối với Backend qua REST API và Socket.IO.

## Cài Node-RED

```powershell
npm install -g --unsafe-perm node-red
node-red
```

Mở trình duyệt: **http://localhost:1880**

Cài thêm node hữu ích (Manage palette):

- `node-red-dashboard` — giao diện chart, gauge, nút bấm
- `node-red-node-ui-table` — bảng dữ liệu (tuỳ chọn)

---

## Luồng dữ liệu

```
ESP32 → MQTT (Mosquitto) → Backend → Node-RED Dashboard
                ↑              │
                └──────────────┘ (điều khiển bơm/quạt, ngưỡng)
```

Node-RED có thể:
- Gọi **REST API** Backend (có JWT)
- Lắng nghe **Socket.IO** realtime (`sensor:update`, `alert:new`)
- Kết nối **MQTT** trực tiếp (tuỳ chọn, song song với Backend)

---

## Bước 1 — Đăng nhập lấy JWT Token

**HTTP Request node:**

| Thuộc tính | Giá trị |
|------------|---------|
| Method | POST |
| URL | `http://localhost:3001/api/auth/login` |
| Payload | `{"username":"admin","password":"123456"}` |

**Function node** (lưu token):

```javascript
const token = msg.payload.token;
flow.set('jwt_token', token);
msg.headers = { Authorization: 'Bearer ' + token };
return msg;
```

Đăng ký tài khoản lần đầu (nếu chưa có):

```
POST http://localhost:3001/api/auth/register
Body: {"username":"admin","email":"a@b.com","password":"123456"}
```

---

## Bước 2 — Lấy trạng thái cảm biến

```
GET http://localhost:3001/api/status
Header: Authorization: Bearer <token>
```

Response mẫu:

```json
{
  "latest": {
    "soilMoisture": 55,
    "temperature": 28.5,
    "humidity": 65,
    "pumpOn": false,
    "fanOn": false
  },
  "deviceOnline": true,
  "thresholds": { "soilMin": 40, "tempMax": 35, "humidityMin": 30 }
}
```

Dùng **Inject** (repeat 5s) + **HTTP Request** + **Dashboard gauge/text** để hiển thị.

---

## Bước 3 — Điều khiển bơm / quạt (CN03)

**Bật bơm:**

```
POST http://localhost:3001/api/control/pump
Header: Authorization: Bearer <token>
Body: {"on": true}
```

**Tắt bơm:** `{"on": false}`

**Bật quạt:**

```
POST http://localhost:3001/api/control/fan
Body: {"on": true}
```

Gắn **Dashboard button** → **Function** (thêm header JWT) → **HTTP Request**.

---

## Bước 4 — Cấu hình ngưỡng (CN08)

```
PUT http://localhost:3001/api/thresholds
Header: Authorization: Bearer <token>
Body: {"soilMin": 50, "tempMax": 35, "humidityMin": 30}
```

Backend tự gửi xuống ESP32 qua MQTT topic `plant/config/threshold`.

---

## Bước 5 — Lịch sử & biểu đồ (CN05 + CN06)

```
GET http://localhost:3001/api/history?hours=24&limit=200
Header: Authorization: Bearer <token>
```

Dùng **Dashboard chart** node, map `msg.payload` → arrays `soilMoisture`, `temperature`, `humidity`.

---

## Bước 6 — Cảnh báo realtime (CN07)

### Cách 1: Polling

```
GET http://localhost:3001/api/alerts?limit=10
```

### Cách 2: Socket.IO (realtime)

Dùng node **websocket client** hoặc **http request** với Socket.IO:
- URL: `http://localhost:3001`
- Event listen: `alert:new`
- Hiển thị **ui_notification** trên Dashboard khi nhận cảnh báo

Payload `alert:new`:

```json
{
  "type": "SOIL_CRITICAL",
  "message": "Dat kho can nghiem trong!",
  "level": "critical"
}
```

---

## Bước 7 — Chatbot (YCNC #8)

```
POST http://localhost:3001/api/chatbot/message
Header: Authorization: Bearer <token>
Body: {"message": "độ ẩm đất"}
```

Response: `{"reply": "Độ ẩm đất hiện tại: 55%..."}`

Các lệnh: `trạng thái`, `bật bơm`, `tắt bơm`, `cảnh báo`, `ngưỡng`, `giúp`

---

## MQTT Topics (kết nối trực tiếp từ Node-RED)

| Topic | Hướng | Mô tả |
|-------|-------|-------|
| `plant/sensor/data` | Subscribe | Dữ liệu cảm biến từ ESP32 |
| `plant/alert` | Subscribe | Cảnh báo từ ESP32 |
| `plant/control/pump` | Publish | Điều khiển bơm (nếu không qua API) |
| `plant/control/fan` | Publish | Điều khiển quạt |
| `plant/config/threshold` | Publish | Gửi ngưỡng xuống ESP32 |

Broker: `mqtt://localhost:1883` (Mosquitto)

---

## Danh sách API đầy đủ

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/auth/register` | Không | Đăng ký |
| POST | `/api/auth/login` | Không | Đăng nhập → JWT |
| GET | `/api/status` | Có | Trạng thái hiện tại |
| GET | `/api/history?hours=24` | Có | Lịch sử cảm biến |
| GET | `/api/alerts` | Có | Danh sách cảnh báo |
| POST | `/api/control/pump` | Có | `{"on": true/false}` |
| POST | `/api/control/fan` | Có | `{"on": true/false}` |
| GET | `/api/thresholds` | Có | Đọc ngưỡng |
| PUT | `/api/thresholds` | Có | Cập nhật ngưỡng |
| POST | `/api/chatbot/message` | Có | `{"message": "..."}` |
| GET | `/health` | Không | Kiểm tra Backend |

## Socket.IO Events

| Event | Hướng | Dữ liệu |
|-------|-------|---------|
| `sensor:update` | Server → Client | Số liệu cảm biến mới |
| `alert:new` | Server → Client | Cảnh báo mới |
| `history:new` | Server → Client | Bản ghi lịch sử mới |
| `device:status` | Server → Client | Online/Offline ESP32 |
| `threshold:ack` | Server → Client | ESP32 xác nhận ngưỡng |
