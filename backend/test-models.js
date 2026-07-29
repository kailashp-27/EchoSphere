const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API key not found in environment variables.");
    return;
  }
  
  console.log("Using API Key:", apiKey.substring(0, 8) + "...");
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // The GoogleGenerativeAI SDK does not natively expose listModels in the same way,
    // but we can hit the REST endpoint directly.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(model => {
        console.log(`- ${model.name} (Methods: ${model.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.log("Response:", data);
    }
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();
