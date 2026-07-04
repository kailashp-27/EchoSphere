const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['note', 'pdf', 'docx', 'url'],
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  fileUrl: {
    type: String,
    default: null,
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  folderName: {
    type: String,
    default: null,
  },
  embedding: {
    type: [Number],
    default: undefined,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Add database index for regular file browsing
documentSchema.index({ folderId: 1 });

module.exports = mongoose.model('Document', documentSchema);