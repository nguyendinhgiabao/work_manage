const Task = require('../models/Task');
const Notebook = require('../models/Notebook');

// @desc    Tạo công việc (Task) mới
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

    // Kiểm tra quyền: Chỉ những ai là chủ sở hữu hoặc thành viên của Notebook mới được thêm Task
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
      status, // 'pending', 'in-progress', 'completed'
      priority, // 'low', 'medium', 'high'
      dueDate,
      user: req.user._id, // Lưu vết người tạo task
      notebook: notebookId,
    });

    await task.populate('notebook', 'title');
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy danh sách công việc (Có bộ lọc theo Sổ tay, Trạng thái, Độ ưu tiên và Tìm kiếm)
// @route   GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const { notebookId, status, priority, search } = req.query;
    
    let filter = {};

    // Phân quyền dữ liệu: Lấy đúng nội dung người dùng được phép xem
    if (notebookId) {
      // 1. Kiểm tra xem user có quyền truy cập vào Notebook này không
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
      // 2. Nếu không chọn Notebook cụ thể, chỉ hiển thị Task do chính User tạo
      filter.user = req.user._id;
    }

    // Các bộ lọc bổ sung
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Tìm kiếm mờ theo tiêu đề hoặc mô tả (Regex Case-Insensitive)
    if (search && search.trim()) {
      const keyword = search.trim();
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    const tasks = await Task.find(filter).populate('notebook', 'title').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thông tin chi tiết của 1 công việc
// @route   GET /api/tasks/:id
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('notebook');

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    // Kiểm tra quyền xem thông qua quyền truy cập Sổ tay chứa Task đó
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

// @desc    Cập nhật nội dung hoặc trạng thái công việc
// @route   PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('notebook');

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    // Phân quyền sửa: Bất kỳ ai có quyền truy cập Notebook (Collaborators) đều có thể kéo thả Task
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
    await updatedTask.populate('notebook', 'title');
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa vĩnh viễn công việc
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('notebook');

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }

    // Bảo mật hành động xóa: Chỉ Chủ sổ tay (Owner) HOẶC Người tạo ra Task mới được xóa
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
