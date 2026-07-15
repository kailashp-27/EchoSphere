const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Note = require('../models/Note');
const Document = require('../models/Document');

const SYSTEM_PROMPT = `You are EchoSphere AI — a helpful, friendly study assistant embedded inside a knowledge management app. The user has stored notes and documents in their knowledge base.

Your job:
- Answer the user's questions based on what they have stored in their knowledge base.
- If the user asks what they have, list the documents from the context.
- Be concise but thorough. Use markdown formatting for clarity when helpful.
- If you don't have enough context to answer, say so honestly and suggest the user upload more material.
- Always maintain a warm, encouraging study-buddy tone.`;

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required. Please set it in the Dashboard.' });
    }

    // Build knowledge context from all files (Option A: titles only)
    const documents = await Document.find().sort({ createdAt: -1 }).select('title type');
    const notes = await Note.find().sort({ createdAt: -1 }).select('title');

    const fileList = [
      ...documents.map(d => `- ${d.title} (${d.type})`),
      ...notes.map(n => `- ${n.title} (note)`)
    ];

    const contextBlock = fileList.length > 0
      ? `The user's knowledge base contains the following documents:\n${fileList.join('\n')}`
      : 'The user has no documents stored in their knowledge base yet.';

    // Build conversation for Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = req.headers['x-model-name'] || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    // Build the full prompt with system instructions, context, history, and latest message
    let conversationPrompt = `${SYSTEM_PROMPT}\n\n### Knowledge Base Context:\n${contextBlock}\n\n### Conversation:\n`;

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

    const result = await model.generateContent(conversationPrompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate response' });
  }
});

module.exports = router;
