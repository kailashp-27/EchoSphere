const mongoose = require('mongoose');

async function resetDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/echosphere');
    console.log('Connected to MongoDB');
    
    // Drop the database to clear out all old collections entirely
    await mongoose.connection.db.dropDatabase();
    console.log('Successfully dropped old echosphere database.');

    // Create the new collections explicitly
    await mongoose.connection.db.createCollection('folders');
    await mongoose.connection.db.createCollection('documents');
    await mongoose.connection.db.createCollection('notes');
    console.log('Successfully recreated folders, documents, and notes collections.');

    process.exit(0);
  } catch (err) {
    console.error('Error resetting DB:', err);
    process.exit(1);
  }
}

resetDB();
