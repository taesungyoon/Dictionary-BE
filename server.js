const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect to the access database
let dbAccess = new sqlite3.Database('credentials.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("Connected to user database!");
});

// Connect to the dictionary database
const dbPath = path.resolve(__dirname, 'dictionary.db');
const dbDictionary = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the dictionary database.');
    }
});

// Access - Validate Password and Signup endpoints
app.post('/validatePassword', (req, res) => {
    const { username, password } = req.body;

    // Using a parameterized query for security
    const sql = 'SELECT * FROM credentials WHERE username = ? AND password = ?';
    dbAccess.all(sql, [username, password], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).send({ error: 'Internal server error' });
            return;
        }
        if (rows.length > 0) {
            res.send({ validation: true }); // Return a success flag
        } else {
            res.send({ validation: false });
        }
    });
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    dbAccess.run(`INSERT INTO credentials (username, password) VALUES ('${username}', '${password}')`, (err) => {
        if (err) {
            console.error(err.message);
            res.send({ success: false });
        } else {
            res.send({ success: true });
        }
    });
});

// Dictionary - Search, Autocomplete, and Search History endpoints
app.get('/search/:word', (req, res) => {
    const sql = 'SELECT lemma, synonyms, antonyms, definition FROM words WHERE lemma = ?';

    dbDictionary.get(sql, [req.params.word], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            // Log the search term to the search_history table
            dbDictionary.run('INSERT INTO search_history (term) VALUES (?)', [req.params.word]);
            res.json(row);
        } else {
            res.status(404).json({ message: 'Word not found' });
        }
    });
});

app.get('/autocomplete/:partialWord', (req, res) => {
    const partialWord = req.params.partialWord;
    const sql = 'SELECT lemma FROM words WHERE lemma LIKE ? LIMIT 10';

    dbDictionary.all(sql, [`${partialWord}%`], (err, rows) => {
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

    dbDictionary.all(sql, [], (err, rows) => {
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
