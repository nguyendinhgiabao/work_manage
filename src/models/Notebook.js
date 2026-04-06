const mongoose = require('mongoose');

const notebookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Vui lòng nhập tên sổ tay'],
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    icon: {
      type: String,
      default: '📄',
    },
    color: {
      type: String,
      default: '', 
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notebook', notebookSchema);
