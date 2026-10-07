# EchoSphere

A study workspace for keeping notes and documents together and asking questions about them. Upload material, organise it into folders, and use the same collection for summaries, explanations, flashcards, and concept graphs.

The app uses React and TypeScript on the frontend, Express on the backend, MongoDB for records, and LanceDB for document embeddings. AI features run through a local Ollama server.

## What it does

- Stores notes, PDF and DOCX uploads, and imported web content.
- Retrieves relevant document passages for chat using `nomic-embed-text` embeddings.
- Generates summaries, concept explanations, flashcards, and exam practice material.
- Builds interactive concept graphs and saves reusable prompts.

Chat is prompted to use retrieved material. Answers can still be incomplete or wrong, particularly if parsing or indexing fails, so check them against the source.

## Run locally

Use Node.js 22.12+, MongoDB, and Ollama. Start MongoDB locally, then pull the two default models:

```bash
ollama pull nomic-embed-text
ollama pull llama3.2:1b
```

Keep Ollama running at `http://localhost:11434`.

```bash
git clone https://github.com/kailashp-27/EchoSphere.git
cd EchoSphere/backend
npm install
```

Create `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/echosphere
PORT=5000
```

Start the API:

```bash
npm start
```

In another terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173). The API runs on port 5000. The default text model is `llama3.2:1b`; model selection is available in the interface.

### A note about Docker

Dockerfiles and a Compose file are included, but the current Compose configuration sets `MONGO_URI` while the backend reads `MONGODB_URI`. It also does not provide an Ollama service, and the backend currently calls Ollama at `localhost:11434`. Those addresses need adjusting for container use. The local setup above avoids these configuration mismatches.

## How retrieval works

Uploaded text is split into roughly 500-word chunks with a 50-word overlap. Ollama generates an embedding for each chunk, and LanceDB stores them in `lancedb_store/` at the repository root. Chat retrieves up to five nearby chunks and sends them with the question to the text model.

If retrieval is unavailable, chat falls back to a list of document titles. That fallback cannot answer detailed questions about the contents. Make sure `nomic-embed-text` is available before adding material, and check the backend logs if indexing fails.

## Code guide

| Path | Purpose |
| --- | --- |
| `frontend/src/components/` | Study tools, file explorer, graphs, and settings |
| `backend/routes/knowledge.js` | Notes, folders, uploads, and content extraction |
| `backend/rag.js` | Chunking, Ollama calls, and LanceDB retrieval |
| `backend/routes/chat.js` | Chat context and response generation |
| `backend/routes/tools.js` | Summaries, explanations, and practice tools |

From `frontend/`, use `npm run build` for a production bundle and `npm run lint` to check the source.

## Design references

- [Architecture diagram](https://drive.google.com/file/d/1ni_RgGjN7F9XYarQekSw0qokId5tgqU7/view?usp=sharing)
- [Interface wireframes](https://www.figma.com/make/o0oFJ9qgmdbQpxuekEYeyl/EchoSphere-Wireframe-Outline)

These describe the design work; the repository code is the reference for the current implementation.
