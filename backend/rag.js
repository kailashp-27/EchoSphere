/**
 * rag.js - Shared RAG utility module
 *
 * Handles:
 *   1. Text chunking
 *   2. Generating embeddings via Ollama (nomic-embed-text)
 *   3. LanceDB vector store operations (upsert, search, delete)
 */

const path = require('path');

// LanceDB path - stores data locally in backend/lancedb_store/
const LANCE_DB_PATH = path.join(__dirname, '..', 'lancedb_store');
const LANCE_TABLE = 'chunks';
const EMBED_MODEL = 'nomic-embed-text';
const OLLAMA_BASE = 'http://localhost:11434';
const CHUNK_SIZE = 500;       // words per chunk
const CHUNK_OVERLAP = 50;     // words overlapping between chunks
const TOP_K = 5;              // number of relevant chunks to retrieve

// ─── Text chunking ──────────────────────────────────────────────────────────

/**
 * Split text into overlapping word-window chunks.
 * @param {string} text
 * @returns {string[]}
 */
function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

// ─── Ollama embedding ────────────────────────────────────────────────────────

/**
 * Generate a 768-dim embedding vector for a single text string
 * using nomic-embed-text via the local Ollama API.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function getEmbedding(text) {
  const response = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama embedding error: ${err}`);
  }

  const data = await response.json();
  return data.embedding; // number[]
}

/**
 * Call Ollama generate endpoint for text generation.
 * @param {string} prompt
 * @param {string} modelName
 * @param {string|null} format  - optional "json" format
 * @returns {Promise<string>}
 */
async function callOllama(prompt, modelName, format = null) {
  const body = { model: modelName, prompt, stream: false };
  if (format) body.format = format;

  const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

// ─── LanceDB helpers ─────────────────────────────────────────────────────────

let _db = null;
let _table = null;

/**
 * Lazily open the LanceDB connection and ensure the chunks table exists.
 * @returns {Promise<import('@lancedb/lancedb').Table>}
 */
async function getTable() {
  if (_table) return _table;

  const lancedb = await import('@lancedb/lancedb');
  _db = await lancedb.connect(LANCE_DB_PATH);

  const existingTables = await _db.tableNames();

  if (existingTables.includes(LANCE_TABLE)) {
    _table = await _db.openTable(LANCE_TABLE);
  } else {
    // Create the table with a dummy record so schema is established
    // The real schema: { vector: float32[768], text: string, documentId: string, sourceType: string }
    const dummy = [{
      vector: new Array(768).fill(0),
      text: '__init__',
      documentId: '__init__',
      sourceType: 'init',
    }];
    _table = await _db.createTable(LANCE_TABLE, dummy);
    // Remove the dummy record
    await _table.delete("documentId = '__init__'");
  }

  return _table;
}

/**
 * Ingest text into LanceDB: chunk → embed → upsert.
 * Also deletes any previous chunks for this document first.
 * @param {string} text          - full extracted text
 * @param {string} documentId    - MongoDB document/note _id as string
 * @param {string} sourceType    - 'pdf' | 'docx' | 'note' | 'url'
 */
async function ingestDocument(text, documentId, sourceType) {
  const table = await getTable();

  // Remove stale chunks for this document
  try {
    await table.delete(`documentId = '${documentId}'`);
  } catch (_) {
    // Table might be empty on first run; safe to ignore
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  console.log(`[RAG] Embedding ${chunks.length} chunks for document ${documentId}...`);

  const rows = [];
  for (const chunk of chunks) {
    const vector = await getEmbedding(chunk);
    rows.push({
      vector,
      text: chunk,
      documentId: String(documentId),
      sourceType,
    });
  }

  await table.add(rows);
  console.log(`[RAG] ✅ Ingested ${rows.length} chunks for document ${documentId}`);
}

/**
 * Delete all chunks for a given document from LanceDB.
 * @param {string} documentId
 */
async function deleteDocumentChunks(documentId) {
  try {
    const table = await getTable();
    await table.delete(`documentId = '${documentId}'`);
    console.log(`[RAG] Deleted chunks for document ${documentId}`);
  } catch (err) {
    console.warn(`[RAG] Could not delete chunks for ${documentId}:`, err.message);
  }
}

/**
 * Retrieve the top-K most relevant text chunks for a query.
 * @param {string} queryText
 * @param {number} k
 * @returns {Promise<string[]>}  - array of chunk text strings
 */
async function retrieveRelevantChunks(queryText, k = TOP_K) {
  try {
    const table = await getTable();
    const queryVector = await getEmbedding(queryText);

    const results = await table
      .vectorSearch(queryVector)
      .limit(k)
      .toArray();

    return results.map(r => r.text);
  } catch (err) {
    console.warn('[RAG] Vector search failed:', err.message);
    return [];
  }
}

module.exports = {
  chunkText,
  getEmbedding,
  callOllama,
  ingestDocument,
  deleteDocumentChunks,
  retrieveRelevantChunks,
};
