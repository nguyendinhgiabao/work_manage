const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');

// Cấu hình transporter gửi email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Tạo JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Đăng ký tài khoản mới (Có xác thực OTP)
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'Vui lòng nhập mã OTP' });
    }

    // Kiểm tra email đã tồn tại chưa
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // Kiểm tra OTP
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
    }

    // Tạo user mới
    const user = await User.create({ name, email, password });

    if (user) {
      // Xóa OTP khỏi database sau khi xác thực thành công
      await Otp.deleteMany({ email });
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Gửi mã OTP xác nhận đăng ký
// @route   POST /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
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
    res.status(500).json({ message: 'Lỗi gửi email: ' + error.message });
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy thông tin profile
// @route   GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Không tìm thấy user' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, sendOtp, login, getProfile };
