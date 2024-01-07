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
        // Create the search_history table if it doesn't exist
        const createSearchHistoryTable = () => {
            const sql = `
                CREATE TABLE IF NOT EXISTS search_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    term TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );               
            `;
        
            dbDictionary.exec(sql, (err) => {
                if (err) {
                    console.error("Error creating tables:", err.message);
                } else {
                    console.log("Tables created successfully");
                }
            });
        };
        
        createSearchHistoryTable();
        
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

// Dictionary - Search, Autocomplete, today sentence and Search History endpoints


// New feature for today sentence
app.get('/randomWord', (req, res) => {
    const sql = 'SELECT lemma, definition FROM words ORDER BY RANDOM() LIMIT 1';
  
    dbDictionary.get(sql, [], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (row) {
        res.json(row); 
      } else {
        res.status(404).json({ message: 'No words found' });
      }
    });
  });

  
  app.post('/api/favorite/:word', (req, res) => {
    const { word } = req.params;

    // Assuming you have a 'favorites' table in your database
    const sql = 'INSERT INTO favorites (term) VALUES (?)';
    dbDictionary.run(sql, [word], (err) => {
        if (err) {
            console.error('Error marking word as favorite:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        res.json({ success: true });
    });
});

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
    const sql = 'SELECT lemma FROM words WHERE lemma LIKE ?';

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

app.get("/api/IELTS", (req, res) => {
  const sql = "SELECT lemma FROM IELTS";

  dbCollection.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const IELTS = rows.map((row) => row.lemma);
    res.json(IELTS);
  });
});
app.get("/api/TOEFL", (req, res) => {
  const sql = "SELECT lemma FROM TOEFL";

  dbCollection.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const TOEFL = rows.map((row) => row.lemma);
    res.json(TOEFL);
  });
});

app.get('/api/favorites', (req, res) => {
    const sql = 'SELECT term FROM favorites ORDER BY timestamp DESC';

    dbDictionary.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const favorites = rows.map((row) => row.term);
        res.json(favorites);
    });
});


app.get('/', (req, res) => {
    res.send('Dictionary Database is connected.');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});