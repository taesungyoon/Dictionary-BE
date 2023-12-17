const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());

const dbPath = path.resolve(__dirname, 'dictionary.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the dictionary database.');
  }
});

// Create a table for search history if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Search endpoint for the database
app.get('/search/:word', (req, res) => {
  const sql = 'SELECT lemma, synonyms, antonyms, definition FROM words WHERE lemma = ?';
  db.get(sql, [req.params.word], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      // Log the search term to the search_history table
      db.run('INSERT INTO search_history (term) VALUES (?)', [req.params.word]);
      res.json(row);
    } else {
      res.status(404).json({ message: 'Word not found' });
    }
  });
});

// Autocomplete endpoint with database
app.get('/autocomplete/:partialWord', (req, res) => {
  const partialWord = req.params.partialWord;
  const sql = 'SELECT lemma FROM words WHERE lemma LIKE ? LIMIT 10';
  db.all(sql, [`${partialWord}%`], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const suggestions = rows.map((row) => row.lemma);
    res.json(suggestions);
  });
});

app.get('/api/searchHistory', (req, res) => {
  const sql = 'SELECT term FROM search_history ORDER BY timestamp DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const searchHistory = rows.map((row) => row.term);
    res.json(searchHistory);
  });
});

app.get('/', (req, res) => {
  res.send('Dictionary Database is connected.');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
