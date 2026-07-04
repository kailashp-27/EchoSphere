# 🌐 EchoSphere
**An AI-Powered Study Environment & Knowledge Management System**

EchoSphere is a full-stack web application developed as a comprehensive intelligent study workspace. It is designed to ingest educational documents, organize knowledge, and leverage cutting-edge LLMs (Large Language Models) to generate visual knowledge graphs, smart summaries, and simplified concept explanations.

Built with the MERN stack and powered by Google's Gemini AI, it features a sleek dark-mode UI and a modular toolset for students, researchers, and lifelong learners.

**Developed by**: KAILASH P (24BRS1382)

## 🚀 Tech Stack
- **Frontend**: React.js (Vite), Tailwind CSS (Enterprise Dark Mode UI), Lucide React (Icons), React Force Graph (Data Visualization)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB & Mongoose 
- **AI Integration**: Google Generative AI (Gemini 1.5 Flash / Gemini 3 Flash Preview)
- **Document Processing**: pdf-parse (PDFs), mammoth (Word Documents)

## 📁 Project Structure
```text
.
├── backend/                  # Node.js API server
│   ├── models/               # MongoDB schemas (Document, Note, Folder, SavedPrompt)
│   ├── routes/               # Express endpoints (knowledge, tools, graph, prompts)
│   ├── uploads/              # Local storage for ingested PDFs and DOCX files
│   ├── index.js              # API entrypoint
│   ├── package.json
│   └── .env                  # excluded via .gitignore
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # UI workspaces (Dashboard, KgGenerator, ConceptExplainer, etc.)
│   │   ├── App.tsx           # Main router & theme provider
│   │   ├── main.tsx
│   │   └── index.css         # Global Tailwind styles
│   ├── package.json
│   └── vite.config.ts
└── README.md                 # You are here
```

## 🧰 Prerequisites
- Node.js (>= 18.x)
- MongoDB (Local instance or MongoDB Atlas URI)
- Google Gemini API Key
- npm or yarn package manager

## ⚙️ Running Locally

### Backend
Open a terminal and navigate to the backend directory:
```bash
cd backend
```
Install Node dependencies:
```bash
npm install
```
Set environment variables by creating a `.env` file in the backend directory:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
```
Run the API server:
```bash
node index.js
```

### Frontend
Open a new terminal window and navigate to the frontend directory:
```bash
cd frontend
```
Install Node dependencies:
```bash
npm install
```
Start the Vite development server:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

## 💡 Key Features

### 🏠 Dashboard & Settings
- **API Configuration**: Dynamically save your Gemini API key directly in the browser (`localStorage`) to securely power all AI features.
- **Quick Actions**: Rapidly jump to document upload, note creation, or tool workspaces.
- **Recent Notes**: Real-time fetched list of recently uploaded PDFs, Word docs, and written notes.

### 📚 Knowledge Manager (Stored KB)
- **Document Ingestion**: Upload `.pdf` and `.docx` files, or write raw text notes.
- **File Parsing**: Backend automatically extracts and sanitizes raw text from complex file formats using `pdf-parse` and `mammoth`.
- **Folder Organization**: Categorize your ingested knowledge into a hierarchical folder structure.

### 🧠 AI Tool Grid
- **Knowledge Graph Generator**: Select any document and watch the AI extract core concepts (Nodes) and dependencies (Edges), rendering them as an interactive, draggable 2D physics-based network graph.
- **Smart Summariser**: Condense massive documents into bite-sized knowledge. Configure the output to be short (bullet points), medium, or long/detailed.
- **Concept Explainer**: Employs the Feynman Technique. Choose your depth: Beginner-friendly, child-like simplicity, or expert-level technical breakdowns.
- **Saved Prompts**: A dedicated workspace to save, copy, and manage your most-used AI prompts.

## 🧮 The AI Processing Pipeline
The system incorporates a dynamic pipeline for AI generation:
1. **Document Selection**: User selects a file via the UI.
2. **Text Extraction**: The backend locates the file (or database note) and extracts raw text buffers.
3. **Prompt Engineering**: The backend injects the text into highly tuned system prompts depending on the selected tool (e.g., instructing the LLM to return strict JSON for the Knowledge Graph).
4. **Dynamic Authentication**: The backend intercepts the `x-api-key` header from the frontend to initialize a sandboxed Gemini instance per request.

## 📦 Deployment
- **Frontend**: Run `npm run build` in the frontend directory (outputs to `dist/`) to prepare for hosts like Vercel or Netlify.
- **Backend**: Can be deployed to any Node.js-compatible host (e.g., Render, Railway, Heroku) with MongoDB Atlas acting as the cloud database.

## 📝 Notes
- Ensure the `.env` file is added to `.gitignore` before pushing to any public repository to protect your API keys.
- Uploaded files are temporarily stored in `backend/uploads/`. In a production environment, consider swapping the `multer` disk storage for cloud storage like AWS S3.
