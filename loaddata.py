import sqlite3
import os

def load_wordnet_data(database_path, wordnet_path):
    # Connect to the SQLite database
    conn = sqlite3.connect(database_path)
    cursor = conn.cursor()

    # Create the table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wordnet_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            synset_id TEXT,
            pos TEXT,
            lemma TEXT,
            sense_key TEXT
        );
    ''')

    # Iterate over WordNet data files
    for file_name in os.listdir(wordnet_path):
        if file_name.endswith(".data"):
            with open(os.path.join(wordnet_path, file_name), "r", encoding="ISO-8859-1") as file:
                for line in file:
                    # Parse the line and insert into the database
                    parts = line.strip().split("\t")
                    if len(parts) == 4:
                        synset_id, pos, lemma, sense_key = parts
                        cursor.execute(
                            "INSERT INTO wordnet_data (synset_id, pos, lemma, sense_key) VALUES (?, ?, ?, ?)",
                            (synset_id, pos, lemma, sense_key),
                        )

    # Commit changes and close the connection
    conn.commit()
    conn.close()

if __name__ == "__main__":
    # Replace these with your actual paths
    database_path = "dict_database.db"
    wordnet_path = "C:\\Program Files (x86)\\WordNet\\2.1\\dict"


    # Call the function to load WordNet data into the SQLite database
    load_wordnet_data(database_path, wordnet_path)
