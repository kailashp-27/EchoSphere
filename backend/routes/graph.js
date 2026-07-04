const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Graph = require('../models/Graph');
const Note = require('../models/Note');
const Document = require('../models/Document');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
//const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are an expert AI instructional designer and educational data engineer. Your task is to extract a structured knowledge graph from the provided educational document to help students map out and study this subject.

### Extraction Rules:
1. Identify all primary educational entities (e.g., Core Concepts, Formulas, Theories, Historical Figures, Events, Case Studies, or Key Terms).
2. Assign each entity a standardized "name" (which will act as the label) and a classification "type" restricted to: CONCEPT, THEORY, FORMULA, PROCESS, PERSON, EVENT, or DEFINITION.
3. Identify clear, directed relationships (edges) between these entities. Focus on educational dependencies, hierarchy, and context using relationship types such as:
   - "PREREQUISITE_FOR" (You must understand X before learning Y)
   - "PART_OF" (X is a sub-topic or component of Y)
   - "EXPLAINS" / "PROVES" (Theory X explains Concept Y)
   - "USED_IN" (Formula X is used to solve Process Y)
   - "OPPOSES" / "CONTRASTS_WITH" (Concept X directly contrasts with Concept Y)

### Output Format:
Provide your response strictly in the following JSON format. Do not write any introductory or concluding conversational text outside of the JSON block.

{
  "nodes": [
    {
      "id": "unique_lowercase_id",
      "name": "Standardized Name",
      "type": "CHOOSE_FROM_ALLOWED_TYPES",
      "summary": "A concise, student-friendly definition or explanation based on the text"
    }
  ],
  "edges": [
    {
      "source": "source_node_id",
      "target": "target_node_id",
      "relationship": "RELATIONSHIP_TYPE",
      "educational_context": "A quick note explaining how these two concepts connect for a learner"
    }
  ]
}
`;

// POST /api/graphs/generate - Generate graph via LLM
router.post('/generate', async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ error: 'documentId is required' });

    let textContent = '';
    
    // First, check if it's a Note
    let file = await Note.findById(documentId);
    if (file) {
      textContent = file.content;
    } else {
      // If not, check if Document
      file = await Document.findById(documentId);
      if (!file) return res.status(404).json({ error: 'Document not found' });
      
      if ((file.type === 'pdf' || file.type === 'docx') && file.fileUrl) {
        const p = path.join(__dirname, '..', file.fileUrl);
        if (fs.existsSync(p)) {
          if (file.type === 'pdf') {
            const dataBuffer = fs.readFileSync(p);
            const pdfData = await pdfParse(dataBuffer);
            textContent = pdfData.text;
          } else if (file.type === 'docx') {
            const docxData = await mammoth.extractRawText({ path: p });
            textContent = docxData.value;
          }
        } else {
          return res.status(404).json({ error: `${file.type.toUpperCase()} file missing on disk` });
        }
      } else if (file.type === 'note' || file.type === 'url') {
        textContent = file.content || 'No content found';
      }
    }

    if (!textContent || !textContent.trim()) {
      return res.status(400).json({ error: 'No text extracted from document' });
    }

    // UPDATED: Use the latest model and enforce strict JSON output
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: {
            responseMimeType: "application/json",
        }
    });

    const prompt = `${SYSTEM_PROMPT}\n\n### Input Educational Document:\n${textContent.substring(0, 30000)}`;
    
    const result = await model.generateContent(prompt);
    const output = result.response.text();
    
    // Because of responseMimeType, we can safely parse directly
    const parsedData = JSON.parse(output);
    
    // Transform LLM output to match our front/back link schemas
    const convertedData = {
      nodes: parsedData.nodes.map((n) => ({
        id: n.id,
        label: n.name,
        val: n.type === 'CONCEPT' || n.type === 'THEORY' ? 5 : 3,
        type: n.type,
        summary: n.summary
      })),
      links: parsedData.edges.map(e => ({
        source: e.source,
        target: e.target,
        label: e.relationship,
        context: e.educational_context
      }))
    };

    res.json(convertedData);

  } catch (err) {
    console.error('Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate graph from AI' });
  }
});

// POST /api/graphs - Save Graph
router.post('/', async (req, res) => {
  try {
    const { documentId, nodes, links } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    const graph = await Graph.findOneAndUpdate(
      { documentId },
      { nodes: nodes || [], links: links || [] },
      { new: true, upsert: true }
    );

    res.status(201).json(graph);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save graph' });
  }
});

// GET /api/graphs/:documentId - Fetch Saved Graph
router.get('/:documentId', async (req, res) => {
  try {
    const graph = await Graph.findOne({ documentId: req.params.documentId });
    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }
    res.json(graph);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

module.exports = router;