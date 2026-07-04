const express = require('express');
const router = express.Router();
const SavedPrompt = require('../models/SavedPrompt');

// GET /api/prompts - Fetch all saved prompts
router.get('/', async (req, res) => {
  try {
    const prompts = await SavedPrompt.find().sort({ createdAt: -1 });
    res.json(prompts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// POST /api/prompts - Create a new saved prompt
router.post('/', async (req, res) => {
  try {
    const { title, prompt } = req.body;
    
    if (!title || !prompt) {
      return res.status(400).json({ error: 'title and prompt are required' });
    }

    const newPrompt = new SavedPrompt({ title, prompt });
    await newPrompt.save();

    res.status(201).json(newPrompt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// DELETE /api/prompts/:id - Delete a saved prompt
router.delete('/:id', async (req, res) => {
  try {
    const deletedPrompt = await SavedPrompt.findByIdAndDelete(req.params.id);
    if (!deletedPrompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json({ message: 'Prompt deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

module.exports = router;
