# Node-RED Frontend — Làm ở đâu?

## Node-RED KHÔNG code trong folder này như React

Node-RED là công cụ **kéo-thả trên trình duyệt**, không viết file `.jsx` / `.html` trong project.

| Cách làm | React (đã bỏ) | Node-RED |
|----------|---------------|----------|
| Code ở đâu | Folder `frontend/src/` | Trình duyệt http://localhost:1880 |
| Lưu ở đâu | File trong git | `C:\Users\<tên-bạn>\.node-red\flows.json` |
| Xem giao diện | localhost:5173 | http://localhost:1880/ui |

---

## Quy trình làm Frontend Node-RED

### Bước 1 — Chạy Node-RED

```powershell
node-red
```

### Bước 2 — Mở Editor (nơi bạn "code" flow)

Trình duyệt: **http://localhost:1880**

Đây là nơi bạn:
- Kéo node từ panel trái vào canvas
- Nối dây giữa các node
- Cấu hình từng node (double-click)
- Bấm **Deploy** (góc phải trên) để lưu & chạy

### Bước 3 — Xem Dashboard (giao diện người dùng)

Trình duyệt: **http://localhost:1880/ui**

Đây là trang giám sát thật — gauge, chart, nút bấm hiện ở đây.

### Bước 4 — Import flow mẫu của project (khuyến nghị)

1. Mở http://localhost:1880
2. Menu **☰** (góc phải) → **Import**
3. Tab **select a file to import** → chọn file:
   ```
   nodered/flows/smart-plant-starter.json
   ```
4. Bấm **Import** → **Deploy**
5. Mở http://localhost:1880/ui xem Dashboard mẫu

### Bước 5 — Lưu flow vào project (cho nhóm / git)

Sau khi chỉnh flow xong, export về folder project:

1. Menu **☰** → **Export**
2. Tab **all flows** hoặc chọn tab **Smart Plant**
3. Bấm **Download**
4. Lưu đè file `nodered/flows/smart-plant-starter.json` (hoặc tên mới)
5. Commit lên git → cả nhóm import lại được

---

## File flow trong project này

```
nodered/
├── README.md                          ← File này
└── flows/
    └── smart-plant-starter.json       ← Flow mẫu import vào Node-RED
```

Flow mẫu đã có sẵn:
- Đăng nhập lấy JWT token
- Hiển thị độ ẩm đất, nhiệt độ, độ ẩm KK (gauge)
- Nút BẬT/TẮT bơm và quạt
- Polling trạng thái mỗi 5 giây

**Trước khi dùng:** sửa username/password trong node **Đăng nhập** cho khớp tài khoản Backend.

---

## Node-RED lưu file ở đâu trên máy?

Mặc định Windows:

```
C:\Users\<TênBạn>\.node-red\
├── flows.json          ← Flow chính (tự động lưu khi Deploy)
├── flows_cred.json     ← Mật khẩu đã mã hoá (nếu có)
└── settings.js         ← Cấu hình Node-RED
```

> Flow trong `.node-red/` là bản trên máy bạn. Muốn chia sẻ nhóm → **Export** về `nodered/flows/` trong project.

---

## Liên kết tài liệu

- Hướng dẫn tích hợp API: [docs/NODERED.md](../docs/NODERED.md)
- Cài Node-RED: [README.md — Bước 4](../README.md)
