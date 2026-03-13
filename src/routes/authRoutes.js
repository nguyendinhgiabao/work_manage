const express = require('express');
const router = express.Router();
const { register, login, getProfile, sendOtp } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/send-otp
router.post('/send-otp', sendOtp);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile (protected)
router.get('/profile', protect, getProfile);

module.exports = router;
