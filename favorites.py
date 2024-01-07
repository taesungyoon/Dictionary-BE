import sqlite3

# Connect to the favorites database
db_favorites = sqlite3.connect('dictionary.db')
cursor_favorites = db_favorites.cursor()

# Create the 'favorites' table if it doesn't exist
cursor_favorites.execute('''
    CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')

# Commit the changes and close the connection
db_favorites.commit()
db_favorites.close()

print('Favorites table created successfully.')
