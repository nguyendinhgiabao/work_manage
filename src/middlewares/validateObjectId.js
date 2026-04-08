const mongoose = require('mongoose');

const validateObjectId = (req, res, next) => {
  // Check req.params.id (which is usually the targeted resource ID)
  if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Đường dẫn chứa ID không hợp lệ' });
  }
  
  // Optionally check additional IDs if they are used flexibly in routes (like userId)
  if (req.params.userId && !mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ message: 'User ID không hợp lệ' });
  }

  next();
};

module.exports = validateObjectId;
