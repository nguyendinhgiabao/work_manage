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

const User = require('../models/User');

// @desc    Lấy danh sách sổ tay của user (bao gồm cả sổ tay được chia sẻ)
// @route   GET /api/notebooks
const getNotebooks = async (req, res, next) => {
  try {
    const notebooks = await Notebook.find({
      $or: [
        { user: req.user._id },
        { collaborators: req.user._id }
      ]
    })
    .populate('user', 'name email')
    .populate('collaborators', 'name email')
    .sort({ createdAt: -1 });
    
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
      $or: [
        { user: req.user._id },
        { collaborators: req.user._id }
      ]
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
      user: req.user._id, // Chỉ chủ sở hữu mới có quyền xóa
    });

    if (!notebook) {
      return res.status(404).json({ message: 'Không tìm thấy sổ tay hoặc bạn không có quyền xóa' });
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

// @desc    Mời thành viên vào sổ tay
// @route   POST /api/notebooks/:id/invite
const inviteMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email người được mời' });
    }

    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user: req.user._id // Chỉ chủ sở hữu mới được mời
    });

    if (!notebook) {
      return res.status(404).json({ message: 'Sổ tay không tồn tại hoặc bạn không có quyền mời' });
    }

    const userToInvite = await User.findOne({ email: email.toLowerCase() });
    if (!userToInvite) {
      return res.status(404).json({ message: 'Người dùng không tồn tại trong hệ thống' });
    }

    if (userToInvite._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Bạn không thể mời chính mình' });
    }

    if (notebook.collaborators.includes(userToInvite._id)) {
      return res.status(400).json({ message: 'Người này đã là thành viên của sổ tay' });
    }

    notebook.collaborators.push(userToInvite._id);
    await notebook.save();

    res.json({ message: 'Đã mời thành viên thành công', notebook });
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa thành viên khỏi sổ tay
// @route   DELETE /api/notebooks/:id/collaborators/:userId
const removeMember = async (req, res, next) => {
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notebook) {
      return res.status(404).json({ message: 'Sổ tay không tồn tại hoặc bạn không có quyền' });
    }

    notebook.collaborators = notebook.collaborators.filter(
      (id) => id.toString() !== req.params.userId
    );
    await notebook.save();

    res.json({ message: 'Đã xóa thành viên', notebook });
  } catch (error) {
    next(error);
  }
};

module.exports = { createNotebook, getNotebooks, updateNotebook, deleteNotebook, inviteMember, removeMember };
