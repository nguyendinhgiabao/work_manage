const nodemailer = require('nodemailer');

// Tách riêng transporter để dễ tái sử dụng và maintain
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Timeout để tránh bị treo khi credentials sai hoặc mạng chậm
  connectionTimeout: 10000,  // 10s kết nối
  greetingTimeout: 10000,    // 10s chờ greeting
  socketTimeout: 10000,      // 10s chờ socket
});

module.exports = transporter;
