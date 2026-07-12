import sqlite3

DATABASE_NAME = "users.db"


def create_connection():
    connection = sqlite3.connect(DATABASE_NAME)
    return connection


def create_users_table():
    connection = create_connection()
    cursor = connection.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        language TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    connection.commit()
    connection.close()

def register_user(name, email, password, language):
    connection = create_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO users (name, email, password, language)
        VALUES (?, ?, ?, ?)
    """, (name, email, password, language))

    connection.commit()
    connection.close()

def login_user(email, password):
    connection = create_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT * FROM users
        WHERE email = ? AND password = ?
    """, (email, password))

    user = cursor.fetchone()

    connection.close()

    return user