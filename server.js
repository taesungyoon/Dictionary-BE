// variable for express. js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const app = express();


// enable cors to all routing
app.use(cors());

const dbPath = path.resolve(__dirname, 'dictionary.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the dictionary database.');
  }
});

// Search end point for the database
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

//Autocomplete endpoint with database
app.get('/autocomplete/:partialWord', (req, res) => {
  const partialWord = req.params.partialWord;
  const sql = 'SELECT lemma FROM words WHERE lemma LIKE ? LIMIT 10';
  db.all(sql, [`${partialWord}%`], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const suggestions = rows.map(row => row.lemma);
    res.json(suggestions);
  });
});

app.get('/', (req, res) => {
  res.send('Dictionary Database is connected.');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
