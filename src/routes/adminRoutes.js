const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  toggleUserStatus, 
  toggleRole, 
  deleteUser, 
  getDashboardStats,
  getActivityLogs,
  broadcastEmail,
  forceResetPassword
} = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Tất cả route trong này đều cần protect và quyền admin
router.use(protect, admin);

// Dashboard
router.get('/stats', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.put('/users/:id/status', toggleUserStatus);
router.put('/users/:id/role', toggleRole);
router.put('/users/:id/password', forceResetPassword);
router.delete('/users/:id', deleteUser);

// Logs & Broadcast
router.get('/logs', getActivityLogs);
router.post('/broadcast', broadcastEmail);

module.exports = router;
