const Folder = require('../models/Folder');
const Document = require('../models/Document');

/**
 * Controller to fetch the contents of a directory (folders and documents).
 * Excludes heavy payload fields (like text content and vector embeddings) from the documents.
 */
const getDirectoryContents = async (req, res) => {
  try {
    const { folderId } = req.query; // or req.params depending on route setup
    
    // Determine the query condition. If folderId is undefined/null/'null', query the root
    const normalizedFolderId = (folderId && folderId !== 'null') ? folderId : null;

    // Fetch folders inside the requested parent
    const folders = await Folder.find({ parentFolderId: normalizedFolderId }).sort({ createdAt: -1 });
    
    // Fetch documents inside the requested parent
    // Use .select() to exclude 'content' and 'embedding' to reduce payload size
    const documents = await Document.find({ folderId: normalizedFolderId })
      .select('-content -embedding')
      .sort({ createdAt: -1 });

    res.json({ folders, documents });
  } catch (err) {
    console.error('Error fetching directory contents:', err);
    res.status(500).json({ error: 'Server error fetching directory contents' });
  }
};

module.exports = {
  getDirectoryContents
};