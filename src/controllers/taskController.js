const Task = require('../models/Task');

// @desc    Tạo công việc mới
// @route   POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, notebookId } = req.body;

    if (!notebookId) {
      return res.status(400).json({ message: 'Cần chọn sổ tay (notebook) để chứa ghi chú' });
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      user: req.user._id,
      notebook: notebookId,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy danh sách công việc của user (lọc theo notebook)
// @route   GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const filter = { user: req.user._id };

    if (req.query.notebookId) {
      filter.notebook = req.query.notebookId;
    }

    // Filter theo status nếu có
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter theo priority nếu có
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy chi tiết 1 công việc
// @route   GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cập nhật công việc
// @route   PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    const { title, description, status, priority, dueDate } = req.body;

    task.title = title || task.title;
    task.description = description !== undefined ? description : task.description;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.dueDate = dueDate !== undefined ? dueDate : task.dueDate;

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Xóa công việc
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    await Task.deleteOne({ _id: task._id });
    res.json({ message: 'Đã xóa công việc' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
