async function testOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      console.log(`Failed to fetch from Ollama: ${response.status} ${response.statusText}`);
      return;
    }
    const data = await response.json();
    if (data.models && data.models.length > 0) {
      console.log("Found Ollama models:");
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log("Ollama is running but no models found.");
    }
  } catch (error) {
    console.log("Could not connect to Ollama on http://localhost:11434. Is it running?");
    console.error(error.message);
  }
}

testOllama();
