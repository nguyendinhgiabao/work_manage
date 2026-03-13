const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middlewares/authMiddleware');

// Tất cả routes đều yêu cầu xác thực
router.use(protect);

// POST /api/tasks - Tạo công việc mới
router.post('/', createTask);

// GET /api/tasks - Lấy danh sách công việc
router.get('/', getTasks);

// GET /api/tasks/:id - Lấy chi tiết công việc
router.get('/:id', getTaskById);

// PUT /api/tasks/:id - Cập nhật công việc
router.put('/:id', updateTask);

// DELETE /api/tasks/:id - Xóa công việc
router.delete('/:id', deleteTask);

module.exports = router;
