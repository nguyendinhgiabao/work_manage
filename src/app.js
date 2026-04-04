const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Load biến môi trường
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// ===== BẢO MẬT =====
// HTTP security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Rate limiting cho auth endpoints (tối đa 20 req / 15 phút)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting chặt hơn cho send-otp (tối đa 5 req / 15 phút)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Quá nhiều yêu cầu gửi OTP, vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ===== ROUTES =====
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/notebooks', require('./routes/notebookRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// Serve frontend cho tất cả routes khác
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== GLOBAL ERROR HANDLER =====
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.stack || err.message}`);
  res.status(err.status || 500).json({
    message: err.status ? err.message : 'Lỗi hệ thống, vui lòng thử lại.',
  });
});

// ===== KHỞI ĐỘNG SERVER =====
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
});
