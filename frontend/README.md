# EchoSphere frontend

The React and TypeScript study workspace for EchoSphere. It includes a file explorer, chat, summaries, flashcards, concept graphs, and model settings.

## Development

Start MongoDB, Ollama, and the API using the [project setup guide](../README.md). Then run from this directory:

```bash
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173). The backend runs on port 5000, and the default local text model is `llama3.2:1b`.

## Useful commands

```bash
npm run build
npm run lint
npm run preview
```

The workspace components are in `src/components/`. Start with `AppLayout.tsx` for navigation, `FileExplorer.tsx` for document management, and `SettingsWorkspace.tsx` for model settings.

Document extraction, embeddings, and text generation happen through the backend. See the root README for model requirements and retrieval behaviour.
