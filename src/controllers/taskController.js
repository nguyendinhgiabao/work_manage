const Task = require('../models/Task');
const Notebook = require('../models/Notebook');

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

    // Kiểm tra quyền trong Notebook (Phải là chủ hoặc thành viên)
    const notebook = await Notebook.findOne({
      _id: notebookId,
      $or: [
        { user: req.user._id },
        { collaborators: req.user._id }
      ]
    });

    if (!notebook) {
      return res.status(403).json({ message: 'Bạn không có quyền thêm công việc vào sổ tay này' });
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

// @desc    Lấy danh sách công việc (lọc theo notebook, status, priority, từ khóa)
// @route   GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const { notebookId, status, priority, search } = req.query;
    
    let filter = {};

    if (notebookId) {
      // 1. Kiểm tra quyền truy cập Notebook
      const notebook = await Notebook.findOne({
        _id: notebookId,
        $or: [
          { user: req.user._id },
          { collaborators: req.user._id }
        ]
      });

      if (!notebook) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập sổ tay này' });
      }
      filter.notebook = notebookId;
    } else {
      // Nếu không lọc theo Notebook -> chỉ lấy Task do chính user tạo
      filter.user = req.user._id;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (search && search.trim()) {
      const keyword = search.trim();
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
    const task = await Task.findById(req.params.id).populate('notebook');

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    // Kiểm tra quyền qua Sổ tay
    const hasAccess = task.notebook.user.equals(req.user._id) || 
                      task.notebook.collaborators.includes(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền xem công việc này' });
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
    const task = await Task.findById(req.params.id).populate('notebook');

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    // Kiểm tra quyền (Bất kỳ thành viên nào trong Sổ tay đều có thể sửa/cập nhật trạng thái)
    const hasAccess = task.notebook.user.equals(req.user._id) || 
                      task.notebook.collaborators.includes(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa công việc này' });
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
    const task = await Task.findById(req.params.id).populate('notebook');

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    // Phân quyền Xóa (Phương án A): Chỉ Chủ sổ tay HOẶC Người tạo Task mới được xóa
    const canDelete = task.user.equals(req.user._id) || 
                      task.notebook.user.equals(req.user._id);

    if (!canDelete) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa công việc này (Chỉ chủ sổ tay hoặc người tạo mới có thể xóa)' });
    }

    await Task.deleteOne({ _id: task._id });
    res.json({ message: 'Đã xóa công việc' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
