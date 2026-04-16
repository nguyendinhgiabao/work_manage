const User = require('../models/User');
const Notebook = require('../models/Notebook');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const transporter = require('../config/email');

// Helper lưu log
const createLog = async (action, byUser, targetUser, details) => {
  try {
    await ActivityLog.create({ action, byUser, targetUser, details });
  } catch (e) {
    console.error('Lỗi khi tạo Log:', e);
  }
};

// @desc    Lấy danh sách toàn bộ người dùng (Có phân trang và tìm kiếm)
// @route   GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const query = {};
    // Xây dựng bộ lọc tìm kiếm theo Tên hoặc Email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password') // Không trả về mật khẩu để bảo mật
      .sort({ createdAt: -1 }) // Sắp xếp người dùng mới nhất lên đầu (Notion Style)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Khóa / Mở Khóa User
// @route   PUT /api/admin/users/:id/status
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Không thể khóa tài khoản Admin' });

    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save();

    await createLog(user.status === 'blocked' ? 'BLOCK_USER' : 'UNBLOCK_USER', req.user._id, user._id, `Thay đổi trạng thái ${user.email} thành ${user.status}`);
    
    res.json({ message: `Đã ${user.status === 'blocked' ? 'khóa' : 'mở khóa'} tài khoản`, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Cấp / Tước quyền Admin
// @route   PUT /api/admin/users/:id/role
const toggleRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    // Không tự tước quyền của chính mình để tránh vô tình tự đào thải
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể tự thay đổi quyền của chính bạn' });
    }

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();

    await createLog('CHANGE_ROLE', req.user._id, user._id, `Thay đổi quyền ${user.email} thành ${user.role}`);

    res.json({ message: `Tài khoản hiện là ${user.role}`, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa user và mọi dữ liệu liên quan (Cascading Delete)
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    
    // Bảo vệ tài khoản Admin: Không thể xóa tài khoản Admin bằng route này
    if (user.role === 'admin') return res.status(400).json({ message: 'Không thể xóa tài khoản Admin' });

    // 1. Xóa toàn bộ Task thuộc các Notebook của User này
    await Task.deleteMany({ notebookId: { $in: await Notebook.find({ user: user._id }).select('_id') } });
    
    // 2. Xóa toàn bộ Notebook của User
    await Notebook.deleteMany({ user: user._id });
    
    // 3. Cuối cùng mới xóa User
    await User.deleteOne({ _id: user._id });
    
    // Ghi nhật ký hành động xóa
    await createLog('DELETE_USER', req.user._id, null, `Đã xoá vĩnh viễn user ${user.email}`);

    res.json({ message: 'Đã xóa người dùng và dữ liệu liên quan' });
  } catch (error) {
    next(error);
  }
};



// @desc    Lấy thống kê dashboard cho trang Admin
// @route   GET /api/admin/stats
const getDashboardStats = async (req, res, next) => {
  try {
    // Đếm tổng số lượng thực thể trong hệ thống
    const totalUsers = await User.countDocuments();
    const totalNotebooks = await Notebook.countDocuments();
    const totalTasks = await Task.countDocuments();
    
    // Thống kê theo trạng thái công việc
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });

    // Tính toán số người dùng mới đăng ký trong 7 ngày gần nhất
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      overview: { users: totalUsers, notebooks: totalNotebooks, tasks: totalTasks },
      taskDistribution: { pending: pendingTasks, inProgress: inProgressTasks, completed: completedTasks },
      newUsers7Days: recentUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy lịch sử hoạt động hệ thống (Activity Logs)
// @route   GET /api/admin/logs
const getActivityLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const logs = await ActivityLog.find()
      .populate('byUser', 'name email') // Thông tin người thực hiện hành động
      .populate('targetUser', 'name email') // Thông tin mục tiêu (nếu là tác động lên user khác)
      .sort({ createdAt: -1 }) // Sắp xếp hoạt động mới nhất lên đầu
      .limit(limit);
    
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// @desc    Gửi Email thông báo (Broadcast cho toàn bộ User Active hoặc gửi riêng lẻ)
// @route   POST /api/admin/broadcast
const broadcastEmail = async (req, res, next) => {
  try {
    const { subject, html, targetEmail } = req.body;
    if (!subject || !html) return res.status(400).json({ message: 'Thiếu chủ đề hoặc nội dung thông báo' });

    // Lấy danh sách email của tất cả những người dùng đang hoạt động trong hệ thống
    const users = await User.find({ status: 'active' }).select('email');
    if (users.length === 0) return res.status(400).json({ message: 'Không có người dùng active nào để gửi' });

    const emails = users.map(u => u.email);
    
    // Đảm bảo cấu hình EMAIL_USER trong .env để làm người gửi và To address
    const adminEmail = process.env.EMAIL_USER;
    if (!adminEmail) {
      console.error('LỖI CRITICAL: process.env.EMAIL_USER chưa được cấu hình!');
      return res.status(500).json({ message: 'Lỗi cấu hình hệ thống Email (EMAIL_USER missing)' });
    }

    // Cấu hình gửi mail thông qua transporter (Nodemailer)
    const mailOptions = {
      from: `"Sổ Tay Kanban" <${adminEmail}>`,
      to: targetEmail || adminEmail, // Nếu gửi lẻ thì To = target, nếu gửi sỉ thì To = Admin
      bcc: targetEmail ? [] : emails,  // Nếu gửi sỉ (Broadcast), dùng BCC để bảo mật danh sách email các thành viên
      subject: subject,
      html: html
    };

    console.log(targetEmail ? `Đang gửi email tới ${targetEmail}...` : `Đang gửi Broadcast tới ${users.length} người dùng...`);
    await transporter.sendMail(mailOptions);
    
    // Ghi nhật ký hành động Broadcast
    await createLog('BROADCAST_EMAIL', req.user._id, null, targetEmail ? `Gửi mail tới ${targetEmail}: ${subject}` : `Gửi thông báo toàn hệ thống: ${subject}`);

    res.json({ message: `Đã phát thông báo thành công tới ${users.length} người dùng` });
  } catch (error) {
    console.error('LỖI GỬI BROADCAST:', error);
    res.status(500).json({ 
      message: 'Lỗi khi gửi email. Hãy kiểm tra cấu hình SMTP hoặc hạn ngạch gửi mail.',
      error: error.message 
    });
  }
};

module.exports = {
  getUsers,
  toggleUserStatus,
  toggleRole,
  deleteUser,

  getDashboardStats,
  getActivityLogs,
  broadcastEmail
};
