const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Folder = require('../models/Folder');
const Document = require('../models/Document');
const Note = require('../models/Note');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    // Only accept PDF, DOCX, and TXT files for knowledge ingestion
    const allowedMimeTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only PDF, DOCX, and TXT are allowed.'));
    }
  }
});

// GET /api/folders - Fetch folders and root files
router.get('/folders', async (req, res) => {
  try {
    const parentId = (req.query.folderId && req.query.folderId !== 'null') ? req.query.folderId : null;
    
    // Get folders inside this parent
    const folders = await Folder.find({ parentFolderId: parentId }).sort({ createdAt: -1 });
    
    // Get documents inside this parent
    const documents = await Document.find({ folderId: parentId }).sort({ createdAt: -1 });

    // Get notes inside this parent
    const notes = await Note.find({ folderId: parentId }).sort({ createdAt: -1 });

    res.json({ folders, documents, notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching folders' });
  }
});

// POST /api/folders - Create a new folder
router.post('/folders', async (req, res) => {
  try {
    const { name, parentFolderId, parentFolderName, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = new Folder({
      name: name.trim(),
      description: description ? description.trim() : '',
      parentFolderId: parentFolderId || null,
      parentFolderName: parentFolderName || null,
    });

    await folder.save();
    res.status(201).json(folder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// PUT /api/folders/:id - Edit folder
router.put('/folders/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await Folder.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), description: description ? description.trim() : '' },
      { new: true }
    );

    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    
    res.json(folder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// DELETE /api/folders/:id - Delete folder
router.delete('/folders/:id', async (req, res) => {
  try {
    const folder = await Folder.findByIdAndDelete(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    
    // Optional: Delete child documents, notes, folders recursively
    // For now we just delete the folder itself.
    res.json({ message: 'Folder deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// POST /api/knowledge/upload - Handle file ingestion
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { folderId, folderName } = req.body;
    let type = 'document';
    
    if (req.file.mimetype === 'application/pdf') {
      type = 'pdf';
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      type = 'docx';
    }

    const document = new Document({
      title: req.file.originalname,
      type,
      fileUrl: `/uploads/${req.file.filename}`,
      folderId: folderId || null,
      folderName: folderName || null,
      vectorStatus: 'pending' // placeholder for vector search embedding
    });

    await document.save();
    res.status(201).json(document);
  } catch (err) {
    console.error(err);
    // Cleanup the uploaded file if document creation fails
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    if (err.message.includes('Unsupported file type')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// POST /api/knowledge/note - Handle raw text ingestion
router.post('/note', async (req, res) => {
  try {
    const { title, content, folderId, folderName } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Note title is required' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const note = new Note({
      title: title.trim(),
      content: content || '',
      folderId: folderId || null,
      folderName: folderName || null,
      vectorStatus: 'pending'
    });

    await note.save();
    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// PUT /api/knowledge/note/:id - Update note content
router.put('/note/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    
    if (title) note.title = title.trim();
    if (content !== undefined) note.content = content;
    
    await note.save();
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// GET /api/knowledge/download/:id - Download PDF
router.get('/download/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || !doc.fileUrl) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filename = doc.fileUrl.split('/uploads/')[1];
    const filePath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    res.download(filePath, doc.title);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// DELETE /api/knowledge/:id - Delete Document or Note
router.delete('/:id', async (req, res) => {
  try {
    // Try to find in Document first
    let doc = await Document.findById(req.params.id);
    if (doc) {
      if (doc.fileUrl) {
        const filename = doc.fileUrl.split('/uploads/')[1];
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await Document.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Document deleted successfully' });
    }

    // Try Note if not found in Document
    let note = await Note.findById(req.params.id);
    if (note) {
      await Note.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Note deleted successfully' });
    }

    return res.status(404).json({ error: 'Document or Note not found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete file/note' });
  }
});

// GET /api/knowledge/all-files - Fetch all documents and notes across all folders (for flat lists)
router.get('/all-files', async (req, res) => {
  try {
    const documents = await Document.find({ type: { $in: ['note', 'pdf'] } }).sort({ createdAt: -1 });
    const notes = await Note.find().sort({ createdAt: -1 });
    
    const formattedDocs = documents.map(d => ({ _id: d._id, name: d.title, type: d.type }));
    const formattedNotes = notes.map(n => ({ _id: n._id, name: n.title, type: 'note' }));
    
    res.json({ files: [...formattedDocs, ...formattedNotes] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch all files' });
  }
});

module.exports = router;