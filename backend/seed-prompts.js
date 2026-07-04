require('dotenv').config();
const mongoose = require('mongoose');
const SavedPrompt = require('./models/SavedPrompt');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/echosphere');
    console.log('MongoDB Connected for seeding');

    // Create some dummy prompts
    const dummyPrompts = [
      {
        title: 'Summarize as a 5-year-old',
        prompt: 'Explain the following text as if I am 5 years old. Use simple words and analogies. Text: {text}'
      },
      {
        title: 'Generate MCQ Quiz',
        prompt: 'Based on the provided text, generate a 5-question multiple choice quiz with an answer key at the bottom. Text: {text}'
      },
      {
        title: 'Extract Key Entities',
        prompt: 'Extract all the key persons, places, and concepts from the text and present them as a bulleted list. Text: {text}'
      }
    ];

    // Clear existing
    await SavedPrompt.deleteMany({});
    
    // Insert new
    await SavedPrompt.insertMany(dummyPrompts);
    console.log('Seeded dummy prompts successfully!');

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
