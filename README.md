# 🚀 Work Management System

## 📝 Mô Tả Dự Án
**Work Management System** là một nền tảng quản lý công việc thông minh, giúp cá nhân và tổ chức tối ưu hóa quy trình làm việc. Hệ thống cho phép người dùng tổ chức nhiệm vụ theo cấu trúc phân cấp linh hoạt, giúp theo dõi tiến độ một cách trực quan và khoa học. Với cơ chế bảo mật cao và giao diện thân thiện, đây là công cụ đắc lực để nâng cao hiệu suất làm việc hàng ngày.

---

## ✨ Tính Năng Chính
- **Quản lý phân cấp**: Tổ chức công việc theo mô hình **Sổ tay > Thư mục > Công việc**, giúp quản lý từ bao quát đến chi tiết.
- **Xác thực an toàn**: Hệ thống đăng ký/đăng nhập tích hợp mã OTP gửi qua Email, đảm bảo tính bảo mật tuyệt đối cho tài khoản.
- **Giao diện trực quan**: Hỗ trợ Dashboard theo dõi trạng thái công việc (Đang làm, Hoàn thành, Quá hạn).
- **Phân quyền người dùng**: Phân chia rõ ràng giữa tài khoản Người dùng (User) và Quản trị viên (Admin).
- **Nhật ký hoạt động**: Admin có thể theo dõi mọi hoạt động thay đổi trên hệ thống để đảm bảo tính minh bạch.
- **Bảo mật đa lớp**: Sử dụng JWT, mã hóa mật khẩu Bcrypt, cùng các lớp phòng vệ chống tấn công Brute-force và XSS.

---

## 📸 Ảnh Demo
![Logo Dự Án](src/public/img/logowebsite.jpeg)
*(Sẽ bổ sung thêm ảnh chụp màn hình giao diện trong tương lai)*

---

## 🛠️ Hướng Dẫn Cài Đặt

### Bước 1: Tải mã nguồn
```bash
git clone <url-cua-ban>
cd work_management
```

### Bước 2: Cài đặt thư viện
```bash
npm install
```

### Bước 3: Cấu hình môi trường (`.env`)
Tạo tệp `.env` tại thư mục gốc và cấu hình các thông số sau:
```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/work_manage
JWT_SECRET=your_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Bước 4: Khởi tạo dữ liệu Admin
```bash
node seedAdmin.js
```

---

## 💡 Cách Sử Dụng
1. **Khởi chạy Server**: 
   - Phát triển: `npm run dev`
   - Vận hành: `npm start`
2. **Truy cập**: Mở trình duyệt và truy cập `http://localhost:3000`.
3. **Đăng ký/Đăng nhập**: Sử dụng Email để nhận mã OTP và bắt đầu trải nghiệm.
4. **Tạo Sổ tay**: Bắt đầu bằng việc tạo một Sổ tay mới, sau đó thêm các Thư mục và Công việc cần làm vào bên trong.
5. **Cập nhật trạng thái**: Đánh dấu hoàn thành công việc sau khi đã xử lý xong.

---

## 💻 Công Nghệ Sử Dụng
- **Backend**: Node.js, Express.js
- **Database**: MongoDB & Mongoose
- **Bảo mật**: JWT, Bcryptjs, Helmet, Express-rate-limit
- **Dịch vụ Email**: Nodemailer (Gửi OTP)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)

---

## 👤 Thông Tin Tác Giả
Mọi thắc mắc hoặc góp ý về dự án, vui lòng liên hệ:

- **Email**: [baonguyendinhgia9@gmail.com](mailto:baonguyendinhgia9@gmail.com)
- **Số điện thoại**: 0398961702
- **Tác giả**: Nguyễn Đình Gia Bảo

---
*Cảm ơn bạn đã quan tâm đến dự án của tôi!*
