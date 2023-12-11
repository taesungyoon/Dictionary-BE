import nltk
nltk.download('wordnet')

# Specify NLTK data path
nltk.data.path.append(r"C:\Users\Tung Do\AppData\Local\Programs\Python\Python311\nltk_data")

# Add more paths if needed, make sure to replace the path with your actual nltk_data path

# Now import other modules
from nltk.corpus import wordnet
import sqlite3

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
    synonyms = ', '.join([l.name() for hypernym in synset.hypernyms() for l in hypernym.lemmas()])
    antonyms = ', '.join([l.name() for hypernym in synset.hyponyms() for l in hypernym.lemmas()])
    definition = synset.definition()

    # Insert data into the "words" table
    cursor.execute('''
        INSERT INTO words (lemma, synonyms, antonyms, definition)
        VALUES (?, ?, ?, ?)
    ''', (lemma, synonyms, antonyms, definition))

# Commit changes and close the connection
conn.commit()
conn.close()
