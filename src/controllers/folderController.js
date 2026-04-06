const Notebook = require('../models/Notebook');
const User = require('../models/User');

// @desc    Lấy danh sách thư mục của user
// @route   GET /api/folders
const getFolders = async (req, res, next) => {
  try {
    const folders = await Folder.find({
      $or: [
        { user: req.user._id },
        { collaborators: req.user._id }
      ]
    })
    .populate('user', 'name email')
    .populate('collaborators', 'name email')
    .sort({ createdAt: 1 });
    
    res.json(folders);
  } catch (error) {
    next(error);
  }
};

// @desc    Tạo thư mục mới
// @route   POST /api/folders
const createFolder = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tên thư mục' });
    }
    const folder = await Folder.create({
      name: name.trim(),
      user: req.user._id,
    });
    res.status(201).json(folder);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật thư mục
// @route   PUT /api/folders/:id
const updateFolder = async (req, res, next) => {
  try {
    const { name, expanded } = req.body;
    const folder = await Folder.findOne({ _id: req.params.id, user: req.user._id });

    if (!folder) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }

    if (name) folder.name = name.trim();
    if (expanded !== undefined) folder.expanded = expanded;

    const updatedFolder = await folder.save();
    res.json(updatedFolder);
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa thư mục (không xóa notebook bên trong)
// @route   DELETE /api/folders/:id
const deleteFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, user: req.user._id });

    if (!folder) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }

    // Cập nhật tất cả notebooks trong thư mục này thành null (Uncategorized)
    await Notebook.updateMany({ folder: folder._id }, { folder: null });

    await Folder.deleteOne({ _id: folder._id });
    res.json({ message: 'Đã xóa thư mục, các sổ tay bên trong đã được đưa ra ngoài' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mời thành viên vào thư mục
// @route   POST /api/folders/:id/invite
const inviteMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email người được mời' });
    }

    const folder = await Folder.findOne({ _id: req.params.id, user: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục hoặc bạn không có quyền' });
    }

    const userToInvite = await User.findOne({ email: email.toLowerCase() });
    if (!userToInvite) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    if (userToInvite._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Bạn không thể mời chính mình' });
    }

    if (folder.collaborators.includes(userToInvite._id)) {
      return res.status(400).json({ message: 'Người này đã là thành viên của thư mục' });
    }

    folder.collaborators.push(userToInvite._id);
    await folder.save();

    res.json({ message: 'Đã mời thành viên vào thư mục thành công' });
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa thành viên khỏi thư mục
// @route   DELETE /api/folders/:id/collaborators/:userId
const removeMember = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, user: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }

    folder.collaborators = folder.collaborators.filter(id => id.toString() !== req.params.userId);
    await folder.save();

    res.json({ message: 'Đã xóa thành viên khỏi thư mục' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  inviteMember,
  removeMember,
};
