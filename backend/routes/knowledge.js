const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Folder = require('../models/Folder');
const Document = require('../models/Document');
const Note = require('../models/Note');
const Graph = require('../models/Graph');
const SavedPrompt = require('../models/SavedPrompt');
const { ingestDocument, deleteDocumentChunks } = require('../rag');

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

    // Compute item counts for each folder in parallel
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const [docCount, noteCount, subFolderCount] = await Promise.all([
          Document.countDocuments({ folderId: folder._id }),
          Note.countDocuments({ folderId: folder._id }),
          Folder.countDocuments({ parentFolderId: folder._id }),
        ]);
        return {
          ...folder.toObject(),
          itemCount: docCount + noteCount + subFolderCount,
        };
      })
    );

    res.json({ folders: foldersWithCounts, documents, notes });
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
      vectorStatus: 'pending',
    });

    await document.save();
    // Respond immediately — ingestion runs in background
    res.status(201).json(document);

    // ── Background RAG ingestion ──────────────────────────────────────
    setImmediate(async () => {
      try {
        const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
        let textContent = '';
        if (type === 'pdf') {
          const buf = fs.readFileSync(filePath);
          const parsed = await pdfParse(buf);
          textContent = parsed.text;
        } else if (type === 'docx') {
          const result = await mammoth.extractRawText({ path: filePath });
          textContent = result.value;
        }
        if (textContent.trim()) {
          await ingestDocument(textContent, String(document._id), type);
          await Document.findByIdAndUpdate(document._id, { vectorStatus: 'completed' });
        } else {
          await Document.findByIdAndUpdate(document._id, { vectorStatus: 'skipped' });
        }
      } catch (ingErr) {
        console.error('[RAG] Background ingestion failed for', document._id, ingErr.message);
        await Document.findByIdAndUpdate(document._id, { vectorStatus: 'error' });
      }
    });
  } catch (err) {
    console.error(err);
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    if (err.message && err.message.includes('Unsupported file type')) {
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
      vectorStatus: 'pending',
    });

    await note.save();
    res.status(201).json(note);

    // ── Background RAG ingestion ──────────────────────────────────────
    setImmediate(async () => {
      try {
        await ingestDocument(content, String(note._id), 'note');
        await Note.findByIdAndUpdate(note._id, { vectorStatus: 'completed' });
      } catch (ingErr) {
        console.error('[RAG] Note ingestion failed for', note._id, ingErr.message);
        await Note.findByIdAndUpdate(note._id, { vectorStatus: 'error' });
      }
    });
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

    // Send inline so browsers (and iframes) can render PDFs directly
    const mimeType = doc.type === 'pdf' ? 'application/pdf' : 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.title)}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// DELETE /api/knowledge/:id - Delete Document or Note
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // Try to find in Document first
    let doc = await Document.findById(id);
    if (doc) {
      if (doc.fileUrl) {
        const filename = doc.fileUrl.split('/uploads/')[1];
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (_) {}
        }
      }
      await Document.findByIdAndDelete(id);
      // Remove RAG chunks from LanceDB
      await deleteDocumentChunks(id);
      return res.json({ message: 'Document deleted successfully' });
    }

    // Try Note if not found in Document
    let note = await Note.findById(id);
    if (note) {
      await Note.findByIdAndDelete(id);
      await deleteDocumentChunks(id);
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
// POST /api/knowledge/web-clip - Scrape a URL and save as a Note
router.post('/web-clip', async (req, res) => {
  try {
    const { url, folderId, folderName } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL. Must start with http:// or https://' });
    }

    // Fetch the page with a browser-like User-Agent
    let html;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EchoSphere/1.0; +https://echosphere.app)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000,
      });
      if (!response.ok) {
        return res.status(502).json({ error: `Failed to fetch page: HTTP ${response.status}` });
      }
      html = await response.text();
    } catch (fetchErr) {
      if (fetchErr.type === 'request-timeout') {
        return res.status(504).json({ error: 'Request timed out. The page took too long to respond.' });
      }
      return res.status(502).json({ error: `Could not reach URL: ${fetchErr.message}` });
    }

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Remove non-content elements
    $('script, style, nav, footer, header, iframe, noscript, form, aside, [role="navigation"], [role="banner"], [role="complementary"]').remove();

    // Extract title
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('title').text() ||
                  parsedUrl.hostname;

    // Extract main content text — prefer article/main, fall back to body
    const contentEl = $('article').length ? $('article') :
                      $('main').length ? $('main') :
                      $('[role="main"]').length ? $('[role="main"]') :
                      $('body');

    // Extract paragraphs and headings
    const textParts = [];
    contentEl.find('h1, h2, h3, h4, p, li').each((_, el) => {
      const tag = $(el).prop('tagName').toLowerCase();
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length < 20) return; // skip very short/empty fragments
      if (tag === 'h1') textParts.push(`# ${text}`);
      else if (tag === 'h2') textParts.push(`## ${text}`);
      else if (tag === 'h3' || tag === 'h4') textParts.push(`### ${text}`);
      else textParts.push(text);
    });

    const content = `Clipped from: ${url}\n\n${textParts.join('\n\n')}`;

    if (textParts.length === 0) {
      return res.status(422).json({ error: 'Could not extract readable content from this page.' });
    }

    // Save as a Note
    const note = new Note({
      title: title.trim().slice(0, 200),
      content,
      folderId: folderId || null,
      folderName: folderName || null,
      vectorStatus: 'pending',
    });

    await note.save();
    res.status(201).json({ note, message: 'Web page clipped and saved successfully.' });

    // ── Background RAG ingestion ──────────────────────────────────────
    setImmediate(async () => {
      try {
        await ingestDocument(content, String(note._id), 'url');
        await Note.findByIdAndUpdate(note._id, { vectorStatus: 'completed' });
      } catch (ingErr) {
        console.error('[RAG] Web clip ingestion failed:', ingErr.message);
        await Note.findByIdAndUpdate(note._id, { vectorStatus: 'error' });
      }
    });
  } catch (err) {
    console.error('Web clip error:', err);
    res.status(500).json({ error: 'Failed to clip web page. Please try again.' });
  }
});

// DELETE /api/knowledge/clear-all - Wipe all knowledge base data
router.delete('/clear-all', async (req, res) => {
  try {
    await Document.deleteMany({});
    await Note.deleteMany({});
    await Folder.deleteMany({});
    await Graph.deleteMany({});
    await SavedPrompt.deleteMany({});
    
    // Clear uploads directory
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          try { fs.unlinkSync(path.join(uploadDir, file)); } catch (_) {}
        }
      }
    }

    // Clear the LanceDB vector store folder entirely
    const lanceDbPath = require('path').join(__dirname, '..', 'lancedb_store');
    if (fs.existsSync(lanceDbPath)) {
      fs.rmSync(lanceDbPath, { recursive: true, force: true });
    }
    
    res.json({ message: 'All data cleared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

module.exports = router;