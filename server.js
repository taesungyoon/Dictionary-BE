// install the libaries needed
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Import uuid module
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// firstly we make sure that the credential database is create or connected.
// Connect to the access database
let dbAccess = new sqlite3.Database('credentials.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("Connected to user database!");
});

const createSearchHistoryTables = () => {
    const createUserSearchHistoryTable = `
        CREATE TABLE IF NOT EXISTS user_search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT NOT NULL,
            term TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createGuestSearchHistoryTable = `
        CREATE TABLE IF NOT EXISTS guest_search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    dbAccess.exec(createUserSearchHistoryTable, (err) => {
        if (err) {
            console.error("Error creating user search history table:", err.message);
        } else {
            console.log("User search history table created successfully");
        }
    });

    dbAccess.exec(createGuestSearchHistoryTable, (err) => {
        if (err) {
            console.error("Error creating guest search history table:", err.message);
        } else {
            console.log("Guest search history table created successfully");
        }
    });
};

createSearchHistoryTables();


// Create an actual database where the favorites words are
const createFavoritesTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT NOT NULL,
            term TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    dbAccess.exec(sql, (err) => {
        if (err) {
            console.error("Error creating favorites table:", err.message);
        } else {
            console.log("Favorites table created successfully");
        }
    });
};


createFavoritesTable();

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

// making sure we are opening the Ielts and TOEFL table
const dbCollectionsPath = path.resolve(__dirname, "dictionary_ver2.db");
const dbCollection = new sqlite3.Database(
    dbCollectionsPath,
    sqlite3.OPEN_READWRITE,
    (err) => {
      if (err) {
        console.error("Error connecting to the database:", err.message);
      } else {
        console.log("Connected to the collection database.");
      }
    }
  );


// Function to generate a random userId
const generateRandomUserId = () => {
    return uuidv4(); // Using UUID v4 for simplicity, you can choose your own method
};

// Access - Validate Password and Signup endpoints
app.post('/validatePassword', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM credentials WHERE username = ? AND password = ?';
    dbAccess.get(sql, [username, password], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).send({ error: 'Internal server error' });
        } else if (row) {
            res.send({ validation: true, userId: row.userId });
        } else {
            res.send({ validation: false });
        }
    });
});


// Signup endpoint
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const userId = generateRandomUserId();

    dbAccess.run(`INSERT INTO credentials (username, password, userId) VALUES (?, ?, ?)`, [username, password, userId], (err) => {
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

  
  // favorite word endpoint, Also making sure that userID is request
  app.post('/api/favorite/:word', (req, res) => {
    const { word } = req.params;
    const { userId } = req.body;
    
    // Stop the words from being duplicate so that our favorite tab doesnt appear 2 words
    const checkSql = 'SELECT * FROM favorites WHERE userId = ? AND term = ?';
    dbAccess.get(checkSql, [userId, word], (err, row) => {
        if (err) {
            console.error('Error checking for existing favorite:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        if (row) {
            res.json({ success: false, message: 'Word is already marked as favorite' });
        } else {
            const insertSql = 'INSERT INTO favorites (userId, term) VALUES (?, ?)';
            dbAccess.run(insertSql, [userId, word], (insertErr) => {
                if (insertErr) {
                    console.error('Error marking word as favorite:', insertErr.message);
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }
                res.json({ success: true });
            });
        }
    });
});

// If the user dont want the word, they delete
app.delete('/api/favorite/:word', (req, res) => {
    const { word } = req.params;
    const { userId } = req.body; // Make sure to send userId in the body of your DELETE request

    const sql = 'DELETE FROM favorites WHERE userId = ? AND term = ?';
    dbAccess.run(sql, [userId, word], function(err) {
        if (err) {
            console.error('Error removing word from favorites:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        if (this.changes > 0) {
            res.json({ success: true, message: 'Word removed from favorites' });
        } else {
            res.json({ success: false, message: 'Word not found in favorites' });
        }
    });
});


// word searching 
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

// suggestions auto complete for inserting partial words in
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

// search history for the Guest user
app.post('/api/guestSearchHistory', (req, res) => {
    const { term } = req.body;
  
    // Check if the term already exists in the guest search history
    const checkSql = 'SELECT * FROM guest_search_history WHERE term = ?';
    dbAccess.get(checkSql, [term], (checkErr, row) => {
      if (checkErr) {
        console.error('Error checking guest search history:', checkErr.message);
        res.status(500).send({ error: 'Internal server error' });
        return;
      }
      
      if (row) {
        // If words alreadyy exist no insert
        res.json({ success: false, message: 'Term already exists in history' });
      } else {
        const sql = 'INSERT INTO guest_search_history (term) VALUES (?)';
        dbAccess.run(sql, [term], (err) => {
          if (err) {
            console.error('Error saving to guest search history:', err.message);
            res.status(500).send({ error: 'Internal server error' });
            return;
          }
          res.send({ success: true });
        });
      }
    });
  });
  
  // Retrieve the guest search history
  app.get('/api/guestSearchHistory', (req, res) => {
    const sql = 'SELECT term FROM guest_search_history ORDER BY timestamp DESC';
  
    dbAccess.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error fetching guest search history:', err.message);
        res.status(500).send({ error: 'Internal server error' });
        return;
      }
      res.send(rows);
    });
  });
  
  // Retrieve user search history
app.get('/api/userSearchHistory/:userId', (req, res) => {
    const { userId } = req.params;
  
    const sql = 'SELECT term FROM user_search_history WHERE userId = ? ORDER BY timestamp DESC';
    dbAccess.all(sql, [userId], (err, rows) => {
      if (err) {
        console.error('Error fetching user search history:', err.message);
        res.status(500).send({ error: 'Internal server error' });
        return;
      }
      res.send(rows);
    });
  });


  // Clear the guest search history
  app.delete('/api/guestSearchHistory', (req, res) => {
    const sql = 'DELETE FROM guest_search_history';
    dbAccess.run(sql, (err) => {
      if (err) {
        console.error('Error clearing guest search history:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      res.json({ success: true, message: 'Guest search history cleared' });
    });
  });
  
  // stop the duplicate for the user search history
  app.post('/api/userSearchHistory', (req, res) => {
    const { userId, term } = req.body;

    const checkSql = 'SELECT * FROM user_search_history WHERE userId = ? AND term = ?';
    dbAccess.get(checkSql, [userId, term], (checkErr, row) => {
      if (checkErr) {
        console.error('Error checking user search history:', checkErr.message);
        res.status(500).send({ error: 'Internal server error' });
        return;
      }
      if (row) {
        res.json({ success: false, message: 'Words already exists in history' });
      } else {
        const sql = 'INSERT INTO user_search_history (userId, term) VALUES (?, ?)';
        dbAccess.run(sql, [userId, term], (err) => {
          if (err) {
            console.error('Error saving to user search history:', err.message);
            res.status(500).send({ error: 'Internal server error' });
            return;
          }
          res.send({ success: true });
        });
      }
    });
  });

  // Clear search history for a specific user
  app.delete('/api/userSearchHistory/:userId', (req, res) => {
    const { userId } = req.params;
  
    const sql = 'DELETE FROM user_search_history WHERE userId = ?';
    dbAccess.run(sql, [userId], (err) => {
      if (err) {
        console.error('Error clearing user search history:', err.message);
        res.status(500).send({ error: 'Internal server error' });
        return;
      }
      res.send({ success: true });
    });
  });

// Ielts for react tab
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

//TOEFL for react tab
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


//Adding favorite for react tab, I also added a string query that grab with userID
app.get('/api/favorites', (req, res) => {
    const { userId } = req.query;

    const sql = 'SELECT term FROM favorites WHERE userId = ? ORDER BY timestamp DESC';
    dbAccess.all(sql, [userId], (err, rows) => {
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
