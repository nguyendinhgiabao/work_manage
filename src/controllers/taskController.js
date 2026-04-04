const Task = require('../models/Task');

// @desc    Tạo công việc mới
// @route   POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, notebookId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tiêu đề công việc' });
    }

    if (!notebookId) {
      return res.status(400).json({ message: 'Cần chọn sổ tay (notebook) để chứa ghi chú' });
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      status,
      priority,
      dueDate,
      user: req.user._id,
      notebook: notebookId,
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy danh sách công việc của user (lọc theo notebook, status, priority, từ khóa)
// @route   GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };

    if (req.query.notebookId) {
      filter.notebook = req.query.notebookId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    // Tìm kiếm theo từ khóa trong title hoặc description
    if (req.query.search && req.query.search.trim()) {
      const keyword = req.query.search.trim();
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy chi tiết 1 công việc
// @route   GET /api/tasks/:id
const getTaskById = async (req, res, next) => {
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
    next(error);
  }
};

// @desc    Cập nhật công việc
// @route   PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    const { title, description, status, priority, dueDate } = req.body;

    task.title = title ? title.trim() : task.title;
    task.description = description !== undefined ? description : task.description;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.dueDate = dueDate !== undefined ? dueDate : task.dueDate;

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa công việc
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
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
    next(error);
  }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
