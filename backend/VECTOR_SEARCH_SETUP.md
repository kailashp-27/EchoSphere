# EchoSphere — Vector Store Setup (LanceDB)

EchoSphere uses **LanceDB** as its embedded vector database for the RAG pipeline.  
No external database server is required — LanceDB stores data locally as files inside `backend/lancedb_store/`.

---

## Architecture

```
User uploads PDF/DOCX/Note
        │
        ▼
Text Extraction (pdf-parse / mammoth)
        │
        ▼
Text Chunking (~500 words, 50-word overlap)
        │
        ▼
Ollama Embedding API  ─── model: nomic-embed-text (768 dims)
        │
        ▼
LanceDB (local file store: backend/lancedb_store/)
        │
        ▼
Chat Query → embed query → vector search → top-5 chunks → LLM prompt
```

---

## Prerequisites

You must have the following Ollama models pulled before using EchoSphere:

```bash
# Text generation model (used for all AI tools)
ollama pull llama3.2:1b

# Embedding model (REQUIRED for RAG pipeline)
ollama pull nomic-embed-text
```

---

## LanceDB Table Schema

| Field        | Type             | Description                            |
|--------------|------------------|----------------------------------------|
| `vector`     | `float32[768]`   | nomic-embed-text embedding             |
| `text`       | `string`         | Raw text of the chunk                  |
| `documentId` | `string`         | MongoDB `_id` of the source document   |
| `sourceType` | `string`         | `pdf`, `docx`, `note`, or `url`        |

---

## Data Lifecycle

- **On upload/note save:** text is extracted, chunked, embedded, and stored in LanceDB (async in background).
- **On document delete:** all corresponding chunks are deleted from LanceDB.
- **On "Clear All Data":** the entire `lancedb_store/` directory is wiped.

---

## .gitignore

Add the following to your `.gitignore` to avoid committing the local vector store:

```
backend/lancedb_store/
```