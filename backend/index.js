require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const knowledgeRoutes = require('./routes/knowledge');
const graphRoutes = require('./routes/graph');
const promptRoutes = require('./routes/prompts');
const toolsRoutes = require('./routes/tools');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
// Note: using /api (or /api/knowledge for knowledge routes) as outlined
// Since knowledgeRoutes has both /folders and /upload, we'll mount it accordingly
app.use('/api', knowledgeRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/graphs', graphRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/tools', toolsRoutes);

// MongoDB connection

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/echosphere')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});