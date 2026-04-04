const nodemailer = require('nodemailer');

// Tách riêng transporter để dễ tái sử dụng và maintain
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = transporter;
