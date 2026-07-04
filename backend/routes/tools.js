const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Note = require('../models/Note');
const Document = require('../models/Document');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Helper to extract text
async function extractTextFromDocument(documentId) {
  let textContent = '';
  let file = await Note.findById(documentId);
  if (file) {
    textContent = file.content;
  } else {
    file = await Document.findById(documentId);
    if (!file) throw new Error('Document not found');
    
    if ((file.type === 'pdf' || file.type === 'docx') && file.fileUrl) {
      const p = path.join(__dirname, '..', file.fileUrl);
      if (fs.existsSync(p)) {
        if (file.type === 'pdf') {
          const dataBuffer = fs.readFileSync(p);
          const pdfData = await pdfParse(dataBuffer);
          textContent = pdfData.text;
        } else if (file.type === 'docx') {
          const docxData = await mammoth.extractRawText({ path: p });
          textContent = docxData.value;
        }
      } else {
        throw new Error(`${file.type.toUpperCase()} file missing on disk`);
      }
    } else if (file.type === 'note' || file.type === 'url') {
      textContent = file.content || 'No content found';
    }
  }

  if (!textContent || !textContent.trim()) {
    throw new Error('No text extracted from document');
  }
  return textContent;
}

// POST /api/tools/summarize
router.post('/summarize', async (req, res) => {
  try {
    const { documentId, length = 'medium' } = req.body;
    if (!documentId) return res.status(400).json({ error: 'documentId is required' });

    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required. Please set it in the Dashboard.' });
    }

    const textContent = await extractTextFromDocument(documentId);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let lengthInstruction = 'a medium-length, comprehensive summary';
    if (length === 'short') lengthInstruction = 'a very brief, concise bullet-point summary';
    if (length === 'long') lengthInstruction = 'a very detailed, long-form summary covering all nuances';

    const prompt = `You are an expert summarizer. Please provide ${lengthInstruction} of the following text:\n\n${textContent.substring(0, 50000)}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({ result: summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate summary' });
  }
});

// POST /api/tools/explain
router.post('/explain', async (req, res) => {
  try {
    const { documentId, depth = 'beginner' } = req.body;
    if (!documentId) return res.status(400).json({ error: 'documentId is required' });

    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required. Please set it in the Dashboard.' });
    }

    const textContent = await extractTextFromDocument(documentId);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let depthInstruction = 'Explain the core concepts simply, as if to a beginner.';
    if (depth === 'feynman') depthInstruction = 'Use the Feynman Technique: explain it as if teaching a child, using simple analogies and removing all jargon.';
    if (depth === 'expert') depthInstruction = 'Provide an advanced, high-level technical breakdown assuming the reader is already a domain expert.';

    const prompt = `You are an expert tutor. Analyze the following text and explain its main concepts.\n${depthInstruction}\n\nText:\n${textContent.substring(0, 50000)}`;
    
    const result = await model.generateContent(prompt);
    const explanation = result.response.text();

    res.json({ result: explanation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to explain concept' });
  }
});

module.exports = router;
