import sqlite3
from nltk.corpus import wordnet, stopwords, words
import nltk

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
        definition TEXT,
        is_brown_word INTEGER DEFAULT 0
    )
''')

# Commit changes
conn.commit()

# Ensure NLTK is pointing to the correct data path
nltk.data.path.append(r"C:\Users\PC\AppData\Roaming\nltk_data")

try:
    nltk.data.find('corpora/words.zip')
except LookupError:
    nltk.download('words')


# Get a list of common English stopwords
stop_words = set(stopwords.words('english'))

# Populate database with WordNet data
for synset in list(wordnet.all_synsets()):
    for lemma_obj in synset.lemmas():
        lemma = lemma_obj.name()

        # Skip common English stopwords
        if lemma.lower() in stop_words:
            continue

        # Synonyms
        synonyms = ', '.join([l.name() for s in lemma_obj.synset().lemmas() for l in s.synset().lemmas() if l != lemma_obj])

        # Antonyms
        antonyms = ', '.join([l.name() for s in lemma_obj.synset().lemmas() for l in s.synset().lemmas() if l != lemma_obj])

        definition = synset.definition()

        # Insert data into the "words" table
        cursor.execute('''
            INSERT INTO words (lemma, synonyms, antonyms, definition, is_brown_word)
            VALUES (?, ?, ?, ?, 1)  -- Set is_brown_word to 1 for all words in this example
        ''', (lemma, synonyms, antonyms, definition))

        # Print information to the console
        print(f"Inserted word: {lemma}, Synonyms: {synonyms}, Antonyms: {antonyms}, Definition: {definition}")

# Populate database with NLTK words corpus data
for word in words.words():
    cursor.execute('''
        INSERT INTO words (lemma, is_brown_word)
        VALUES (?, 1)  -- Set is_brown_word to 1 for all words in this example
    ''', (word,))

    # Print information to the console
    print(f"Inserted word from words corpus: {word}")

# Commit changes and close the connection
conn.commit()
conn.close()