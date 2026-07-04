const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    default: '',
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
  vectorStatus: {
    type: String,
    default: 'pending'
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

noteSchema.index({ folderId: 1 });

module.exports = mongoose.model('Note', noteSchema);