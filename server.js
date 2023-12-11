// variacble for express. js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const dbPath = path.resolve(__dirname, 'dictionary.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the dictionary database.');
  }
});

// Define the search endpoint that queries your SQLite database
app.get('/search/:word', (req, res) => {
  const sql = 'SELECT lemma, synonyms, antonyms, definition FROM words WHERE lemma = ?';
  db.get(sql, [req.params.word], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      res.json(row);
    } else {
      res.status(404).json({ message: 'Word not found' });
    }
  });
});

// Optionally, you can define a root route just to confirm that the server is running
app.get('/', (req, res) => {
  res.send('Dictionary Database is connected.');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
