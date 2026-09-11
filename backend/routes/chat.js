const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const Document = require('../models/Document');
const { retrieveRelevantChunks, callOllama } = require('../rag');

const SYSTEM_PROMPT = `You are EchoSphere AI — a helpful, precise study assistant embedded inside a knowledge management app. You answer the user's questions using ONLY the context chunks retrieved from their knowledge base.

Your rules:
- Answer based solely on the provided context. Do NOT hallucinate or invent facts.
- If the context is insufficient to answer, say so honestly and suggest uploading more material.
- Be concise but thorough. Use markdown formatting for clarity.
- Maintain a warm, encouraging study-buddy tone.`;

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const modelName = req.headers['x-model-name'] || 'llama3.2:1b';

    // ── Step 1: Retrieve top-K relevant chunks from LanceDB via RAG ──────────
    let contextBlock = '';
    let chunksFetched = false;
    try {
      const relevantChunks = await retrieveRelevantChunks(message, 5);
      if (relevantChunks.length > 0) {
        contextBlock = relevantChunks
          .map((chunk, i) => `[Chunk ${i + 1}]:\n${chunk}`)
          .join('\n\n');
        chunksFetched = true;
      }
    } catch (ragErr) {
      console.warn('[Chat] RAG retrieval unavailable, falling back to file listing:', ragErr.message);
    }

    // ── Fallback: if RAG is unavailable, provide file titles as context ───────
    if (!chunksFetched) {
      const documents = await Document.find().sort({ createdAt: -1 }).select('title type');
      const notes = await Note.find().sort({ createdAt: -1 }).select('title');
      const fileList = [
        ...documents.map(d => `- ${d.title} (${d.type})`),
        ...notes.map(n => `- ${n.title} (note)`),
      ];
      contextBlock = fileList.length > 0
        ? `The user's knowledge base contains these documents (no vector index available yet):\n${fileList.join('\n')}`
        : 'The user has no documents stored in their knowledge base yet.';
    }

    // ── Step 2: Build the full prompt ─────────────────────────────────────────
    let conversationPrompt = `${SYSTEM_PROMPT}\n\n### Relevant Knowledge Base Context:\n${contextBlock}\n\n### Conversation:\n`;

    if (history && history.length > 0) {
      for (const turn of history) {
        if (turn.role === 'user') {
          conversationPrompt += `User: ${turn.text}\n`;
        } else {
          conversationPrompt += `Assistant: ${turn.text}\n`;
        }
      }
    }

    conversationPrompt += `User: ${message}\nAssistant:`;

    // ── Step 3: Generate response via Ollama ──────────────────────────────────
    const reply = await callOllama(conversationPrompt, modelName);

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate response' });
  }
});

module.exports = router;
