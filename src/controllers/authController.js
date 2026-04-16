const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const transporter = require('../config/email');

// Tạo JWT token (có hiệu lực trong 7 ngày) để duy trì phiên đăng nhập cho người dùng
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @desc    Đăng ký tài khoản mới (Yêu cầu xác thực qua mã OTP)
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, otp } = req.body;

    // 1. Kiểm tra các trường thông tin bắt buộc
    if (!name || !email || !password || !otp) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    // 2. Kiểm tra độ dài mật khẩu để đảm bảo bảo mật cơ bản
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Kiểm tra email đã tồn tại chưa
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // 4. Kiểm tra tính hợp lệ của mã OTP (đúng email và đúng mã số)
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
    }

    // 5. Khởi tạo tài khoản người dùng mới (Mật khẩu được băm tự động trong User Model)
    const user = await User.create({ name, email, password });

    if (user) {
      // 6. Xóa toàn bộ OTP cũ của email này để tránh việc tái sử dụng
      await Otp.deleteMany({ email });
      // Ghi nhật ký đăng ký
      const ActivityLog = require('../models/ActivityLog');
      try {
        await ActivityLog.create({ action: 'REGISTER', byUser: user._id, details: 'Tài khoản đăng ký mới' });
      } catch (e) {}

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Gửi mã OTP xác nhận đăng ký
// @route   POST /api/auth/send-otp
const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email' });
    }

    // Kiểm tra xem email đã tồn tại chưa
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email này đã được sử dụng' });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ message: 'Chưa cấu hình tài khoản Email gửi trên Server' });
    }

    // Tạo mã OTP ngẫu nhiên 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Xóa mã OTP cũ nếu có và lưu mã mới
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });

    // Cấu hình email html
    const mailOptions = {
      from: `"Sổ Tay Kanban" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Mã xác nhận đăng ký Sổ Tay Kanban',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e8e4dc; border-radius: 8px;">
          <h2 style="color: #37352f; text-align: center;">Xác nhận tài khoản</h2>
          <p style="color: #787774; text-align: center;">Vui lòng nhập mã OTP dưới đây để hoàn tất việc đăng ký Sổ tay mới.</p>
          <div style="background-color: #f7f5f2; padding: 15px; text-align: center; margin: 20px 0; border-radius: 6px;">
            <b style="font-size: 28px; color: #eb5757; letter-spacing: 4px;">${otp}</b>
          </div>
          <p style="color: #9b9a97; font-size: 13px; text-align: center;">Mã này có hiệu lực trong vòng 5 phút.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Mã OTP đã được gửi đến email của bạn' });
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng nhập hệ thống
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    }

    // Tìm người dùng theo email
    const user = await User.findOne({ email });

    // Kiểm tra xem user có tồn tại và mật khẩu có khớp không
    if (user && (await user.matchPassword(password))) {
      // Ghi lại nhật ký đăng nhập để Admin có thể quản lý lịch sử truy cập
      const ActivityLog = require('../models/ActivityLog');
      try {
        await ActivityLog.create({ action: 'LOGIN', byUser: user._id, details: 'Đăng nhập thành công' });
      } catch (e) {}

      // Trả về thông tin người dùng kèm theo JWT Token
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thông tin cá nhân (Profile) của người dùng đang đăng nhập
// @route   GET /api/auth/profile
const getProfile = async (req, res, next) => {
  try {
    // req.user được gán từ Middleware bảo vệ (protect)
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Không tìm thấy user' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật thông tin cá nhân và mật khẩu
// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const { name, currentPassword, newPassword } = req.body;

    // 1. Cập nhật Tên hiển thị nếu có thay đổi
    if (name) {
      user.name = name.trim();
    }

    // 2. Xử lý đổi Mật khẩu (yêu cầu mật khẩu cũ để xác thực)
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập mật khẩu cũ để xác thực đổi mật khẩu mới' });
      }
      
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      }

      user.password = newPassword;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      token: generateToken(updatedUser._id),
      message: 'Cập nhật tài khoản thành công',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, sendOtp, login, getProfile, updateProfile };
