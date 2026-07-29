const fetch = require('node-fetch');
async function test() {
  const body = {
    model: 'llama3.2:1b',
    prompt: 'You are an expert educator creating study flashcards. Based on the text below, generate exactly 2 high-quality flashcards.\n\nRules:\n- Return ONLY a valid JSON array.\n\nFormat:\n[\n  { "front": "Question here?", "back": "Answer here." }\n]\n\nText: Photosynthesis is the process by which plants use sunlight to synthesize foods from carbon dioxide and water.',
    stream: false,
    format: 'json'
  };
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  console.log("Raw Output:");
  console.log(data.response);
}
test();
