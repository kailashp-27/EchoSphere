const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  val: { type: Number, default: 1 }
}, { _id: false });

const linkSchema = new mongoose.Schema({
  source: { type: String, required: true },
  target: { type: String, required: true },
  label: { type: String, required: true }
}, { _id: false });

const graphSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  nodes: [nodeSchema],
  links: [linkSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Graph', graphSchema);