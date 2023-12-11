import sqlite3
from nltk.corpus import wordnet

# Connect to SQLite database (or create it if not exists)
conn = sqlite3.connect('dictionary.db')
cursor = conn.cursor()

# Create a table for words
cursor.execute('''
    CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lemma TEXT NOT NULL,
        synonyms TEXT,
        antonyms TEXT,
        definition TEXT
    )
''')

# Commit changes
conn.commit()

# Populate database with WordNet data
for synset in list(wordnet.all_synsets()):
    lemma = synset.lemmas()[0].name()
    synonyms = ', '.join([lemma.name() for lemma in synset.lemmas() if lemma.name() != lemma])
    antonyms = ', '.join([antonym.name() for lemma in synset.lemmas() for antonym in lemma.antonyms()])
    definition = synset.definition()

    # Insert data into the "words" table
    cursor.execute('''
        INSERT INTO words (lemma, synonyms, antonyms, definition)
        VALUES (?, ?, ?, ?)
    ''', (lemma, synonyms, antonyms, definition))

# Commit changes and close the connection
conn.commit()
conn.close()
