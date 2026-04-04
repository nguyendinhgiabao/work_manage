const Notebook = require('../models/Notebook');
const Task = require('../models/Task');

// @desc    Tạo sổ tay mới
// @route   POST /api/notebooks
const createNotebook = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tên sổ tay' });
    }
    const notebook = await Notebook.create({
      title: title.trim(),
      user: req.user._id,
    });
    res.status(201).json(notebook);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy danh sách sổ tay của user
// @route   GET /api/notebooks
const getNotebooks = async (req, res, next) => {
  try {
    const notebooks = await Notebook.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notebooks);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật tên sổ tay
// @route   PUT /api/notebooks/:id
const updateNotebook = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tên sổ tay' });
    }

    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notebook) {
      return res.status(404).json({ message: 'Không tìm thấy sổ tay' });
    }

    notebook.title = title.trim();
    const updatedNotebook = await notebook.save();
    res.json(updatedNotebook);
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa sổ tay (kèm theo toàn bộ task bên trong)
// @route   DELETE /api/notebooks/:id
const deleteNotebook = async (req, res, next) => {
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notebook) {
      return res.status(404).json({ message: 'Không tìm thấy sổ tay' });
    }

    // Xóa tất cả tasks thuộc sổ tay này trước
    await Task.deleteMany({ notebook: notebook._id });

    // Sau đó xóa sổ tay
    await Notebook.deleteOne({ _id: notebook._id });
    res.json({ message: 'Đã xóa sổ tay và các ghi chú bên trong' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createNotebook, getNotebooks, updateNotebook, deleteNotebook };
