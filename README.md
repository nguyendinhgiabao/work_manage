# Hệ Thống Quản Lý Công Việc (Work Management System)

## 📝 Giới Thiệu Tổng Quan
Dự án **Work Management** là một hệ thống backend mạnh mẽ được xây dựng bằng Node.js và Express, được thiết kế để giúp người dùng tổ chức công việc theo cấu trúc phân cấp: **Sổ tay (Notebooks) > Thư mục (Folders) > Công việc (Tasks)**. Hệ thống tích hợp các cơ chế bảo mật hiện đại, xác thực mã OTP qua email và quản trị viên (Admin) để theo dõi hoạt động toàn hệ thống.

---

## 🚀 Công Nghệ Áp Dụng
Hệ thống sử dụng các công nghệ hiện đại nhằm đảm bảo hiệu năng và tính bảo mật:

- **Ngôn ngữ & Runtime**: Node.js, JavaScript (CommonJS).
- **Framework**: Express.js (Phiên bản mới nhất).
- **Cơ sở dữ liệu**: MongoDB với thư viện Mongoose để quản lý Schema.
- **Xác thực & Bảo mật**:
  - **JWT (JSON Web Token)**: Quản lý phiên đăng nhập của người dùng.
  - **Bcryptjs**: Mã hóa mật khẩu an toàn.
  - **Helmet**: Bảo vệ ứng dụng khỏi các lỗ hổng web phổ biến.
  - **Express-rate-limit**: Chống tấn công Brute-force bằng cách giới hạn số lượng yêu cầu.
  - **CORS**: Kiểm soát các nguồn truy cập vào API.
- **Tiện ích khác**:
  - **Nodemailer**: Gửi mã OTP xác thực qua Email.
  - **Dotenv**: Quản lý biến môi trường.

---

## 🏗️ Cấu Trúc Thư Mục
Dự án được tổ chức theo mô hình MVC thu gọn, giúp dễ dàng mở rộng và bảo trì:

```text
work_management/
├── src/
│   ├── app.js            # Điểm khởi đầu của ứng dụng (Entry point)
│   ├── config/           # Cấu hình DB và các dịch vụ khác
│   ├── controllers/      # Xử lý logic nghiệp vụ
│   ├── middlewares/      # Chặn/lọc yêu cầu (Auth, Validation, Bảo mật)
│   ├── models/           # Định nghĩa Schema cho MongoDB (Mongoose)
│   ├── routes/           # Định nghĩa các API endpoints
│   └── public/           # Các tệp tĩnh (Giao diện web nếu có)
├── .env                  # Biến môi trường (Chứa thông tin nhạy cảm)
├── package.json          # Quản lý thư viện và scripts
└── seedAdmin.js          # Script để tạo tài khoản Admin mặc định
```

---

## 🔄 Luồng Đi Của Dữ Liệu (Data Flow)
1. **Request**: Người dùng gửi yêu cầu từ trình duyệt hoặc ứng dụng mobile đến server.
2. **Middleware**: Yêu cầu đi qua các lớp bảo mật (Helmet), giới hạn tần suất (Rate Limit), và kiểm tra token (Auth Middleware) nếu cần.
3. **Routing**: Hệ thống phân loại yêu cầu dựa trên URL (ví dụ: `/api/tasks` sẽ được chuyển đến `taskRoutes`).
4. **Controller**: Thực hiện xử lý logic (tính toán, kiểm tra quyền hạn, gọi DB).
5. **Model**: Tương tác với MongoDB để lấy hoặc ghi dữ liệu.
6. **Response**: Controller nhận kết quả từ Model và gửi phản hồi trả lại cho người dùng theo định dạng JSON.

---

## ⚙️ Cài Đặt Và Khởi Chạy

### 1. Yêu Cầu Hệ Thống
- Node.js (Phiên bản >= 16.x)
- MongoDB (Sử dụng MongoDB Atlas hoặc local)

### 2. Các Bước Cài Đặt
Tải mã nguồn về máy và thực hiện các bước sau:

```bash
# Cài đặt các thư viện phụ thuộc
npm install

# Tạo tài khoản Admin mặc định (Lần đầu tiên)
node seedAdmin.js
```

### 3. Cấu Hình Biến Môi Trường (`.env`)
Tạo tệp `.env` ở thư mục gốc và điền các thông tin sau:
```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/work_manage
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
ALLOWED_ORIGIN=*
```

### 4. Khởi Chạy Dự Án
- **Chế độ phát triển (Development)**: Sử dụng `--watch` để tự động khởi động lại khi sửa code.
  ```bash
  npm run dev
  ```
- **Chế độ vận hành (Production)**:
  ```bash
  npm start
  ```

---

## 🛠️ Các Tính Năng Chính
- **Hệ thống xác thực**: Đăng ký, Đăng nhập và Quên mật khẩu thông qua mã OTP gửi tới Email.
- **Quản lý phân cấp**: Tạo sổ tay, trong sổ tay chứa thư mục, trong thư mục chứa công việc chi tiết.
- **Quản trị**: Admin có thể xem nhật ký hoạt động (`ActivityLogs`) và quản lý người dùng.
- **Bảo mật**: Giới hạn số lần gửi OTP (5 lần/15 phút) và giới hạn đăng nhập (20 lần/15 phút).

---
*Dự án được phát triển bởi đội ngũ đam mê công nghệ.*
