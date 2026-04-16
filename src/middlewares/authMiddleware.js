const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware bảo vệ các Route yêu cầu đăng nhập
 * Phân tích JWT Token từ Header: Authorization: Bearer <token>
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 1. Tách Token từ chuỗi Bearer
      token = req.headers.authorization.split(' ')[1];

      // 2. Giải mã Token lấy User ID dựa trên JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Truy vấn User từ database (không lấy mật khẩu) và gán vào req.user
      req.user = await User.findById(decoded.id).select('-password');

      // Kiểm tra nếu User không còn tồn tại trong hệ thống
      if (!req.user) {
        return res.status(401).json({ message: 'User không tồn tại' });
      }

      // Kiểm tra nếu tài khoản đang bị khóa bởi Admin
      if (req.user.status === 'blocked') {
        return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa' });
      }

      next(); // Cho phép đi tiếp vào Controller xử lý
    } catch (error) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
  }

  // Nếu không tìm thấy Token trong Header
  if (!token) {
    return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
  }
};

/**
 * Middleware kiểm tra quyền Quản trị viên (Admin)
 * Chỉ được dùng sau khi đã qua middleware 'protect'
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next(); // Có quyền Admin -> đi tiếp
  } else {
    res.status(403).json({ message: 'Không có quyền truy cập, yêu cầu quyền Admin' });
  }
};

module.exports = { protect, admin };
