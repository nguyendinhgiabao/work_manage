const Notebook = require('../models/Notebook');
const Task = require('../models/Task');

// @desc    Tạo sổ tay mới
// @route   POST /api/notebooks
const createNotebook = async (req, res) => {
  try {
    const { title } = req.body;
    const notebook = await Notebook.create({
      title: title || 'Sổ tay mới',
      user: req.user._id,
    });
    res.status(201).json(notebook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy danh sách sổ tay của user
// @route   GET /api/notebooks
const getNotebooks = async (req, res) => {
  try {
    const notebooks = await Notebook.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notebooks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cập nhật tên sổ tay
// @route   PUT /api/notebooks/:id
const updateNotebook = async (req, res) => {
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notebook) {
      return res.status(404).json({ message: 'Không tìm thấy sổ tay' });
    }

    notebook.title = req.body.title || notebook.title;
    const updatedNotebook = await notebook.save();
    res.json(updatedNotebook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Xóa sổ tay (kèm theo toàn bộ task bên trong)
// @route   DELETE /api/notebooks/:id
const deleteNotebook = async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createNotebook, getNotebooks, updateNotebook, deleteNotebook };
