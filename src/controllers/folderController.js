const Folder = require('../models/Folder');
const Notebook = require('../models/Notebook');

// @desc    Lấy danh sách thư mục của user
// @route   GET /api/folders
const getFolders = async (req, res, next) => {
  try {
    const folders = await Folder.find({ user: req.user._id }).sort({ createdAt: 1 });
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

module.exports = {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
};
