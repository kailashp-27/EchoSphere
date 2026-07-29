const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Note = require('../models/Note');
const Document = require('../models/Document');
async function callOllama(prompt, modelName, format = null) {
  const body = {
    model: modelName,
    prompt: prompt,
    stream: false
  };
  if (format) {
    body.format = format;
  }
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.response;
}
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

    const textContent = await extractTextFromDocument(documentId);
    const modelName = req.headers['x-model-name'] || 'llama3.2:1b';

    let lengthInstruction = 'a medium-length, comprehensive summary';
    if (length === 'short') lengthInstruction = 'a very brief, concise bullet-point summary';
    if (length === 'long') lengthInstruction = 'a very detailed, long-form summary covering all nuances';

    const prompt = `You are an expert summarizer. Please provide ${lengthInstruction} of the following text:\n\n${textContent.substring(0, 50000)}`;
    
    const summary = await callOllama(prompt, modelName);

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

    const textContent = await extractTextFromDocument(documentId);
    const modelName = req.headers['x-model-name'] || 'llama3.2:1b';

    let depthInstruction = 'Explain the core concepts simply, as if to a beginner.';
    if (depth === 'feynman') depthInstruction = 'Use the Feynman Technique: explain it as if teaching a child, using simple analogies and removing all jargon.';
    if (depth === 'expert') depthInstruction = 'Provide an advanced, high-level technical breakdown assuming the reader is already a domain expert.';

    const prompt = `You are an expert tutor. Analyze the following text and explain its main concepts.\n${depthInstruction}\n\nText:\n${textContent.substring(0, 50000)}`;
    
    const explanation = await callOllama(prompt, modelName);

    res.json({ result: explanation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to explain concept' });
  }
});

// POST /api/tools/flashcards
router.post('/flashcards', async (req, res) => {
  try {
    const { documentId, count = 10, difficulty = 'mixed' } = req.body;
    if (!documentId) return res.status(400).json({ error: 'documentId is required' });

    const textContent = await extractTextFromDocument(documentId);
    const modelName = req.headers['x-model-name'] || 'llama3.2:1b';

    let difficultyInstruction = 'Mix easy recall, conceptual understanding, and applied questions.';
    if (difficulty === 'easy') difficultyInstruction = 'Focus on basic definitions, key terms, and simple recall questions.';
    if (difficulty === 'hard') difficultyInstruction = 'Focus on deep conceptual questions, comparisons, and application of knowledge.';

    const prompt = `You are an expert educator creating study flashcards. Based on the text below, generate exactly ${count} high-quality flashcards.

${difficultyInstruction}

Rules:
- Each flashcard must have a FRONT (a clear, specific question) and BACK (a concise, accurate answer).
- Fronts should be genuine questions, not just fill-in-the-blank or definitions only.
- Backs should be thorough but concise (1-3 sentences max).
- Cover the most important topics in the text.
- Return ONLY a valid JSON array — no markdown, no commentary.

Format:
[
  { "front": "Question here?", "back": "Answer here." },
  ...
]

Text:
${textContent.substring(0, 50000)}`;

    const raw = await callOllama(prompt, modelName, "json");

    // Strip any markdown code fences if present
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let flashcards;
    try {
      let parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        flashcards = parsed;
      } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
        flashcards = parsed.flashcards;
      } else if (parsed.front && parsed.back) {
        flashcards = [parsed];
      } else {
        const vals = Object.values(parsed);
        if (vals.length > 0 && vals[0].front && vals[0].back) {
          flashcards = vals;
        } else {
          throw new Error('Not an array');
        }
      }
    } catch {
      return res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
    }

    res.json({ flashcards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate flashcards' });
  }
});

// POST /api/tools/exam-predictor
router.post('/exam-predictor', async (req, res) => {
  try {
    const { documentId, count = 5, difficulty = 'medium', type = 'mixed' } = req.body;
    if (!documentId) return res.status(400).json({ error: 'documentId is required' });

    const textContent = await extractTextFromDocument(documentId);
    const modelName = req.headers['x-model-name'] || 'llama3.2:1b';

    let difficultyInstruction = 'Create questions of moderate difficulty, suitable for a mid-term exam.';
    if (difficulty === 'easy') difficultyInstruction = 'Create basic recall questions, suitable for a quiz.';
    if (difficulty === 'hard') difficultyInstruction = 'Create challenging, analytical, and conceptual questions, suitable for a final exam.';

    let typeInstruction = 'Mix multiple-choice and short-answer questions.';
    if (type === 'mcq') typeInstruction = 'Create ONLY multiple-choice questions (with 4 options).';
    if (type === 'short-answer') typeInstruction = 'Create ONLY short-answer questions.';
    if (type === 'essay') typeInstruction = 'Create ONLY essay-type questions that require detailed explanations.';

    const prompt = `You are an expert professor creating an exam based on the text below. Generate exactly ${count} high-quality exam questions.

${difficultyInstruction}
${typeInstruction}

Rules:
- Generate questions that test true understanding, not just trivial facts.
- Return ONLY a valid JSON array — no markdown, no commentary.

Format:
[
  { 
    "question": "Question text here", 
    "type": "mcq | short-answer | essay",
    "options": ["Option A", "Option B", "Option C", "Option D"], // ONLY include options if type is mcq
    "answer": "Correct answer text (or correct option for mcq)", 
    "explanation": "Brief explanation of why the answer is correct." 
  },
  ...
]

Text:
${textContent.substring(0, 50000)}`;

    const raw = await callOllama(prompt, modelName, "json");

    // Strip any markdown code fences if present
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let questions;
    try {
      let parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else if (parsed.question && parsed.type) {
        questions = [parsed];
      } else {
        const vals = Object.values(parsed);
        if (vals.length > 0 && vals[0].question) {
          questions = vals;
        } else {
          throw new Error('Not an array');
        }
      }
    } catch {
      return res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
    }

    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate exam questions' });
  }
});

module.exports = router;
