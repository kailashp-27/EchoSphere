const mongoose = require('mongoose');

const SavedPromptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  prompt: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: 'General',
  }
}, { timestamps: true });

module.exports = mongoose.model('SavedPrompt', SavedPromptSchema);
